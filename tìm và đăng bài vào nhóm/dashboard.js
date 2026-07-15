document.addEventListener('DOMContentLoaded', () => {
  // ========== TAB SWITCHING ==========
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      
      // Remove active from all buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      
      // Remove active from all content
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active to clicked button
      btn.classList.add('active');
      
      // Add active to corresponding content
      const targetTab = document.getElementById(`${tabName}-tab`);
      if (targetTab) {
        targetTab.classList.add('active');
      }
    });
  });

  // ========== ACCOUNT TYPE SELECTOR ==========
  const accountTypeBtns = document.querySelectorAll('.account-type-btn');
  const accountSettingsPanels = document.querySelectorAll('.account-settings-panel');

  accountTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const accountType = btn.getAttribute('data-type');
      
      // Remove active from all buttons
      accountTypeBtns.forEach(b => b.classList.remove('active'));
      
      // Hide all panels
      accountSettingsPanels.forEach(panel => panel.style.display = 'none');
      
      // Add active to clicked button
      btn.classList.add('active');
      
      // Show corresponding panel
      const targetPanel = document.getElementById(`${accountType}-settings`);
      if (targetPanel) {
        targetPanel.style.display = 'block';
      }
      
      // Load settings from storage
      loadSettings(accountType);
    });
  });

  // ========== SETTINGS STORAGE ==========
  const STORAGE_KEYS = {
    oldAcc: 'fbtoolkit_old_account_settings',
    cloneAcc: 'fbtoolkit_clone_account_settings'
  };

  function getStorageKey(accountType) {
    return accountType === 'old-account' ? STORAGE_KEYS.oldAcc : STORAGE_KEYS.cloneAcc;
  }

  function loadSettings(accountType) {
    const key = getStorageKey(accountType);
    chrome.storage.local.get([key], (result) => {
      const settings = result[key] || {};
      
      if (accountType === 'old-account') {
        document.getElementById('oldAccMinDelay').value = settings.minDelay || 60;
        document.getElementById('oldAccMaxDelay').value = settings.maxDelay || 180;
        document.getElementById('oldAccMaxPostsPerDay').value = settings.maxPostsPerDay || 20;
        document.getElementById('oldAccSafeMode').checked = settings.safeMode !== false;
        document.getElementById('oldAccErrorDelay').value = settings.errorDelay || 300;
        document.getElementById('oldAccMaxRetry').value = settings.maxRetry || 3;
      } else {
        document.getElementById('cloneAccMinDelay').value = settings.minDelay || 20;
        document.getElementById('cloneAccMaxDelay').value = settings.maxDelay || 90;
        document.getElementById('cloneAccMaxPostsPerDay').value = settings.maxPostsPerDay || 50;
        document.getElementById('cloneAccWarmupMode').checked = settings.warmupMode !== false;
        document.getElementById('cloneAccWarmupDays').value = settings.warmupDays || 3;
        document.getElementById('cloneAccWarmupMaxPosts').value = settings.warmupMaxPosts || 10;
        document.getElementById('cloneAccErrorDelay').value = settings.errorDelay || 180;
        document.getElementById('cloneAccMaxRetry').value = settings.maxRetry || 2;
        document.getElementById('cloneAccAggressive').value = settings.aggressive || 'normal';
      }
    });
  }

  function saveSettings(accountType) {
    const key = getStorageKey(accountType);
    let settings = {};
    
    if (accountType === 'old-account') {
      settings = {
        minDelay: parseInt(document.getElementById('oldAccMinDelay').value),
        maxDelay: parseInt(document.getElementById('oldAccMaxDelay').value),
        maxPostsPerDay: parseInt(document.getElementById('oldAccMaxPostsPerDay').value),
        safeMode: document.getElementById('oldAccSafeMode').checked,
        errorDelay: parseInt(document.getElementById('oldAccErrorDelay').value),
        maxRetry: parseInt(document.getElementById('oldAccMaxRetry').value)
      };
    } else {
      settings = {
        minDelay: parseInt(document.getElementById('cloneAccMinDelay').value),
        maxDelay: parseInt(document.getElementById('cloneAccMaxDelay').value),
        maxPostsPerDay: parseInt(document.getElementById('cloneAccMaxPostsPerDay').value),
        warmupMode: document.getElementById('cloneAccWarmupMode').checked,
        warmupDays: parseInt(document.getElementById('cloneAccWarmupDays').value),
        warmupMaxPosts: parseInt(document.getElementById('cloneAccWarmupMaxPosts').value),
        errorDelay: parseInt(document.getElementById('cloneAccErrorDelay').value),
        maxRetry: parseInt(document.getElementById('cloneAccMaxRetry').value),
        aggressive: document.getElementById('cloneAccAggressive').value
      };
    }
    
    chrome.storage.local.set({ [key]: settings }, () => {
      showFeedback('✅ Lưu cài đặt thành công!', 'success');
    });
  }

  function resetSettings(accountType) {
    const key = getStorageKey(accountType);
    chrome.storage.local.remove([key], () => {
      loadSettings(accountType);
      showFeedback('🔄 Khôi phục mặc định thành công!', 'warning');
    });
  }

  function showFeedback(message, type) {
    const feedbackEl = document.getElementById('settingsFeedback');
    feedbackEl.textContent = message;
    feedbackEl.style.display = 'block';
    feedbackEl.style.background = type === 'success' ? '#d1fae5' : '#fef3c7';
    feedbackEl.style.color = type === 'success' ? '#065f46' : '#92400e';
    feedbackEl.style.borderLeft = `4px solid ${type === 'success' ? '#10b981' : '#f59e0b'}`;
    
    setTimeout(() => {
      feedbackEl.style.display = 'none';
    }, 3000);
  }

  // Save button
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      const activeAccountType = document.querySelector('.account-type-btn.active')?.getAttribute('data-type');
      if (activeAccountType) {
        saveSettings(activeAccountType);
      }
    });
  }

  // Reset button
  const btnResetSettings = document.getElementById('btnResetSettings');
  if (btnResetSettings) {
    btnResetSettings.addEventListener('click', () => {
      const activeAccountType = document.querySelector('.account-type-btn.active')?.getAttribute('data-type');
      if (activeAccountType && confirm('Bạn chắc chắn muốn khôi phục mặc định?')) {
        resetSettings(activeAccountType);
      }
    });
  }

  // Load initial settings on page load
  const firstAccountType = document.querySelector('.account-type-btn.active')?.getAttribute('data-type');
  if (firstAccountType) {
    loadSettings(firstAccountType);
  }

  // ========== MAIN POSTING LOGIC ==========
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

    const delaySeconds = parseInt(document.getElementById('delaySeconds').value) || 60;

    let targetGroups = Array.from(checkedBoxes).map(cb => currentGroups[cb.dataset.index]);

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
          text: spunContent
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
