document.addEventListener('DOMContentLoaded', () => {
  const btnSearch = document.getElementById('btnSearch');
  const searchInput = document.getElementById('searchInput');
  const groupsBody = document.getElementById('groupsBody');
  const selectAll = document.getElementById('selectAll');
  const selectedCount = document.getElementById('selectedCount');
  const btnStartPost = document.getElementById('btnStartPost');
  const logContainer = document.getElementById('logContainer');

  let currentGroups = [];
  
  function addLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const logItem = document.createElement('div');
    logItem.className = `log-item ${type}`;
    logItem.innerHTML = `<span class="time">[${time}]</span> ${message}`;
    logContainer.appendChild(logItem);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // Helper function to extract FB tokens for manual frontend fetch if backend message fails
  // But we send messages to background.js for better isolation
  
  btnSearch.addEventListener('click', () => {
    const keyword = searchInput.value.trim();
    if (!keyword) return alert('Vui lòng nhập từ khóa tìm kiếm (Ví dụ: mua bán acc fifa)');
    
    btnSearch.disabled = true;
    btnSearch.textContent = 'Đang quét...';
    groupsBody.innerHTML = '<tr><td colspan="4" class="empty-state">Đang quét nhóm trên Facebook... Vui lòng đợi khoảng vài giây.</td></tr>';
    currentGroups = [];
    updateSelection();

    chrome.runtime.sendMessage({ action: 'searchGroups', keyword }, (response) => {
      btnSearch.disabled = false;
      btnSearch.textContent = 'Quét Nhóm';

      if (!response || !response.success) {
        addLog(`Lỗi khi quét nhóm: ${response?.error || 'Lỗi kết nối background'}`, 'error');
        groupsBody.innerHTML = '<tr><td colspan="4" class="empty-state">Đã xảy ra lỗi khi quét. Xem nhật ký.</td></tr>';
        return;
      }

      try {
        if (response.data.errors) {
          throw new Error("FB API Error: " + JSON.stringify(response.data.errors[0]));
        }
        if (!response.data.data) {
          console.error("RAW FB RESPONSE:", response.data);
          throw new Error("Không có data trả về. (RAW: " + JSON.stringify(response.data).substring(0, 100) + "...)");
        }
        const serpData = response.data.data.serpResponse || response.data.data.serpBase;
        const edges = serpData?.results?.edges;
        
        if (!edges || edges.length === 0) {
          throw new Error("Không tìm thấy kết quả nào từ Facebook");
        }

        edges.forEach(edge => {
          const strategy = edge.rendering_strategy || edge.relay_rendering_strategy;
          if (strategy && strategy.view_model && strategy.view_model.profile) {
            const group = strategy.view_model.profile;
            // Only add if it's a group
            if (group.__typename === "Group") {
              currentGroups.push({
                id: group.id,
                name: group.name,
                members: group.group_member_count ? `${(group.group_member_count / 1000).toFixed(1)}K` : 'Không rõ',
                privacy: 'Công khai'
              });
            }
          }
        });

        // Some fallback parsing in case the structure is different
        if (currentGroups.length === 0) {
          addLog('Không trích xuất được UID từ kết quả tìm kiếm. Facebook có thể thay đổi cấu trúc.', 'warning');
        }

        renderGroups();
        addLog(`Quét thành công ${currentGroups.length} nhóm.`, 'success');
      } catch (e) {
        addLog(`Lỗi parse dữ liệu Facebook: ${e.message}. Có thể tài khoản chưa đăng nhập hoặc cookie bị lỗi.`, 'error');
        groupsBody.innerHTML = '<tr><td colspan="4" class="empty-state">Không thể phân tích dữ liệu. Vui lòng thử lại.</td></tr>';
      }
    });
  });

  function renderGroups() {
    if (currentGroups.length === 0) {
      groupsBody.innerHTML = '<tr><td colspan="4" class="empty-state">Không tìm thấy nhóm nào phù hợp.</td></tr>';
      return;
    }

    groupsBody.innerHTML = currentGroups.map((g, index) => `
      <tr>
        <td><input type="checkbox" class="group-checkbox" data-index="${index}" checked></td>
        <td><strong>${g.name}</strong></td>
        <td><code>${g.id}</code></td>
        <td>${g.members}</td>
      </tr>
    `).join('');

    document.querySelectorAll('.group-checkbox').forEach(cb => {
      cb.addEventListener('change', updateSelection);
    });
    
    selectAll.checked = true;
    updateSelection();
  }

  selectAll.addEventListener('change', (e) => {
    document.querySelectorAll('.group-checkbox').forEach(cb => {
      cb.checked = e.target.checked;
    });
    updateSelection();
  });

  function updateSelection() {
    const checked = document.querySelectorAll('.group-checkbox:checked').length;
    selectedCount.textContent = `Đã chọn: ${checked} nhóm`;
  }

  function spinText(text) {
    const matches = text.match(/\{[^{}]*\}/g);
    if (!matches) return text;
    let spun = text;
    matches.forEach(match => {
      const options = match.substring(1, match.length - 1).split('|');
      const randomOption = options[Math.floor(Math.random() * options.length)];
      spun = spun.replace(match, randomOption);
    });
    if (spun.includes('{') && spun.includes('}')) return spinText(spun);
    return spun;
  }

  btnStartPost.addEventListener('click', async () => {
    const checkedBoxes = document.querySelectorAll('.group-checkbox:checked');
    if (checkedBoxes.length === 0) return alert('Vui lòng chọn ít nhất 1 nhóm để đăng!');
    
    const rawContent = document.getElementById('postContent').value.trim();
    if (!rawContent) return alert('Vui lòng nhập nội dung bài viết!');

    const isAnonymous = document.getElementById('isAnonymous').checked;
    const bgColor = document.getElementById('bgColor').value;
    const delaySeconds = parseInt(document.getElementById('delaySeconds').value) || 60;
    const maxGroupsInput = parseInt(document.getElementById('maxGroups').value) || 10;

    let targetGroups = Array.from(checkedBoxes).map(cb => currentGroups[cb.dataset.index]);
    if (targetGroups.length > maxGroupsInput) {
      targetGroups = targetGroups.slice(0, maxGroupsInput);
      addLog(`Giới hạn đăng: Chỉ đăng vào ${maxGroupsInput} nhóm đầu tiên.`, 'warning');
    }

    btnStartPost.disabled = true;
    addLog(`Bắt đầu chiến dịch đăng vào ${targetGroups.length} nhóm. Tần suất: ${delaySeconds}s/bài...`, 'info');

    for (let i = 0; i < targetGroups.length; i++) {
      const group = targetGroups[i];
      const spunContent = spinText(rawContent);
      
      addLog(`[${i+1}/${targetGroups.length}] Đang gửi bài: "${spunContent.substring(0, 30)}..." vào "${group.name}"...`, 'info');
      
      const success = await new Promise(resolve => {
        chrome.runtime.sendMessage({
          action: 'createPost',
          groupId: group.id,
          text: spunContent,
          anonymous: isAnonymous,
          colorId: bgColor
        }, response => {
          if (response && response.success && !response.data.errors) {
            resolve(true);
          } else {
            addLog(`Chi tiết lỗi FB: ${JSON.stringify(response?.data?.errors || response?.error || 'Unknown')}`, 'error');
            resolve(false);
          }
        });
      });

      if (success) {
        addLog(`Đăng thành công vào nhóm "${group.name}"!`, 'success');
      } else {
        addLog(`Thất bại khi đăng vào nhóm "${group.name}".`, 'error');
      }

      if (i < targetGroups.length - 1) {
        addLog(`Chờ ${delaySeconds} giây (Delay)...`, 'warning');
        await new Promise(r => setTimeout(r, delaySeconds * 1000));
      }
    }

    addLog('Chiến dịch đăng bài đã hoàn tất thành công!', 'success');
    btnStartPost.disabled = false;
  });
});
