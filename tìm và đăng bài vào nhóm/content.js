// content.js - Chrome Extension Content Script
// Inject Dashboard overlay vào Facebook

if (typeof window.fbToolkitInjected === 'undefined') {
  window.fbToolkitInjected = true;

  let overlayHost = null;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "toggleDashboard") {
      if (overlayHost) {
        overlayHost.remove();
        overlayHost = null;
        document.body.style.overflow = '';
      } else {
        injectDashboard();
      }
    }
  });

  async function injectDashboard() {
    overlayHost = document.createElement('div');
    overlayHost.id = 'fbtoolkit-dashboard-host';
    overlayHost.style.position = 'fixed';
    overlayHost.style.top = '0';
    overlayHost.style.left = '0';
    overlayHost.style.width = '100vw';
    overlayHost.style.height = '100vh';
    overlayHost.style.zIndex = '999999999';
    overlayHost.style.overflowY = 'auto';

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const shadow = overlayHost.attachShadow({ mode: 'open' });

    const cssUrl = chrome.runtime.getURL('dashboard.css') + '?t=' + Date.now();
    const htmlUrl = chrome.runtime.getURL('dashboard.html') + '?t=' + Date.now();

    try {
      const [cssText, htmlText] = await Promise.all([
        fetch(cssUrl).then(r => {
          if (!r.ok) throw new Error(`CSS load failed: ${r.status}`);
          return r.text();
        }),
        fetch(htmlUrl).then(r => {
          if (!r.ok) throw new Error(`HTML load failed: ${r.status}`);
          return r.text();
        })
      ]);

      const style = document.createElement('style');
      style.textContent = cssText.replace(/body\s*\{/g, '.wrapper {');
      shadow.appendChild(style);

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const container = doc.querySelector('.app-container');

      if (!container) throw new Error('Invalid HTML structure');

      const wrapper = document.createElement('div');
      wrapper.className = 'wrapper';
      wrapper.style.minHeight = '100vh';
      wrapper.style.width = '100%';
      wrapper.style.position = 'relative';
      wrapper.style.isolation = 'isolate';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '❌ Đóng Dashboard';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '20px';
      closeBtn.style.right = '20px';
      closeBtn.style.zIndex = '1000';
      closeBtn.style.padding = '10px 20px';
      closeBtn.style.background = '#ef4444';
      closeBtn.style.color = 'white';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '8px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.fontWeight = 'bold';
      closeBtn.onclick = () => {
        overlayHost.remove();
        overlayHost = null;
        document.body.style.overflow = originalOverflow;
      };
      wrapper.appendChild(closeBtn);
      wrapper.appendChild(container);
      shadow.appendChild(wrapper);
      document.body.appendChild(overlayHost);

      initDashboardLogic(shadow);
    } catch (error) {
      console.error('[FBToolkit] Dashboard load error:', error);
      overlayHost.remove();
      overlayHost = null;
      alert('Lỗi tải Dashboard: ' + error.message);
    }
  }

  function getTokensFromPage() {
    const html = document.documentElement.innerHTML;
    const c_user = document.cookie.match(/c_user=(\d+)/)?.[1];
    const fb_dtsg = html.match(/"DTSGInitialData",\[\],{"token":"([^"]+)"/)?.[1];
    const lsd = html.match(/"LSD",\[\],{"token":"([^"]+)"/)?.[1];
    const jazoestMatch = html.match(/jazoest=(\d+)/) || html.match(/"jazoest":"(\d+)"/);
    const jazoest = jazoestMatch ? jazoestMatch[1] : '';

    const spinrMatch = html.match(/"__spin_r":(\d+)/);
    const spinbMatch = html.match(/"__spin_b":"([^"]+)"/);
    const spintMatch = html.match(/"__spin_t":(\d+)/);

    if (!c_user || !fb_dtsg) throw new Error("Vui lòng đăng nhập Facebook");

    return {
      c_user, fb_dtsg, lsd, jazoest,
      __spin_r: spinrMatch ? spinrMatch[1] : '',
      __spin_b: spinbMatch ? spinbMatch[1] : '',
      __spin_t: spintMatch ? spintMatch[1] : '',
      timestamp: Date.now()
    };
  }

  async function searchGroupsFB(keyword) {
    // 🔥 REFETCH TOKENS MỖI LẦN GỌI
    const tokens = getTokensFromPage();
    
    const variables = {
      "count": 50,
      "allow_streaming": false,
      "args": {
        "callsite": "COMET_GLOBAL_SEARCH",
        "config": {
          "exact_match": false,
          "high_confidence_config": null,
          "intercept_config": null,
          "sts_disambiguation": null,
          "watch_config": null
        },
        "context": {
          "bsid": "79a6abfb-acf9-4169-8892-cb819d1565bc",
          "tsid": "0.36458269881411975"
        },
        "experience": {
          "client_defined_experiences": ["ADS_PARALLEL_FETCH"],
          "encoded_server_defined_params": "Abo6mQGTwumSH8ghiQqAvvjPX7NFviMO4wSBhxr6grIQwUayjg5k0ye5FNdIS2HCiLkkJOB-TfP5YV29lVJ9zt3H",
          "fbid": null,
          "type": "SERVER_DEFINED"
        },
        "filters": [],
        "text": keyword
      },
      "cursor": null,
      "feedbackSource": 23,
      "fetch_filters": true,
      "renderLocation": "search_results_page",
      "scale": 1,
      "stream_initial_count": 0,
      "useDefaultActor": false,
      "__relay_internal__pv__GHLShouldChangeAdIdFieldNamerelayprovider": true,
      "__relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider": true,
      "__relay_internal__pv__CometFeedStory_enable_reactor_facepilerelayprovider": false,
      "__relay_internal__pv__CometFeedStory_enable_post_permalink_white_space_clickrelayprovider": false,
      "__relay_internal__pv__CometUFICommentActionLinksRewriteEnabledrelayprovider": false,
      "__relay_internal__pv__CometUFICommentAvatarStickerAnimatedImagerelayprovider": false,
      "__relay_internal__pv__IsWorkUserrelayprovider": false,
      "__relay_internal__pv__TestPilotShouldIncludeDemoAdUseCaserelayprovider": false,
      "__relay_internal__pv__FBReels_deprecate_short_form_video_context_gkrelayprovider": true,
      "__relay_internal__pv__FBReels_enable_view_dubbed_audio_type_gkrelayprovider": true,
      "__relay_internal__pv__CometImmersivePhotoCanUserDisable3DMotionrelayprovider": false,
      "__relay_internal__pv__WorkCometIsEmployeeGKProviderrelayprovider": false,
      "__relay_internal__pv__IsMergQAPollsrelayprovider": false,
      "__relay_internal__pv__FBReelsMediaFooter_comet_enable_reels_ads_gkrelayprovider": true,
      "__relay_internal__pv__CometUFIReactionsEnableShortNamerelayprovider": false,
      "__relay_internal__pv__CometUFICommentAutoTranslationTyperelayprovider": "AUTO_TRANSLATE",
      "__relay_internal__pv__CometUFIShareActionMigrationrelayprovider": true,
      "__relay_internal__pv__CometUFISingleLineUFIrelayprovider": true,
      "__relay_internal__pv__CometUFI_dedicated_comment_routable_dialog_gkrelayprovider": true,
      "__relay_internal__pv__FBReelsIFUTileContent_reelsIFUPlayOnHoverrelayprovider": true,
      "__relay_internal__pv__GroupsCometGYSJFeedItemHeightrelayprovider": 206,
      "__relay_internal__pv__ShouldEnableBakedInTextStoriesrelayprovider": false,
      "__relay_internal__pv__StoriesShouldIncludeFbNotesrelayprovider": true
    };

    const body = new URLSearchParams();
    body.append("av", tokens.c_user);
    body.append("__user", tokens.c_user);
    body.append("__a", "1");
    body.append("__req", "1");
    body.append("__comet_req", "15");
    body.append("fb_dtsg", tokens.fb_dtsg);
    body.append("jazoest", tokens.jazoest);
    body.append("lsd", tokens.lsd);
    body.append("__spin_r", tokens.__spin_r);
    body.append("__spin_b", tokens.__spin_b);
    body.append("__spin_t", tokens.__spin_t);
    body.append("fb_api_caller_class", "RelayModern");
    body.append("fb_api_req_friendly_name", "SearchCometResultsInitialResultsQuery");
    body.append("variables", JSON.stringify(variables));
    body.append("server_timestamps", "true");
    body.append("doc_id", "35386341880980078");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch("https://www.facebook.com/api/graphql/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const responseText = await res.text();
      const cleanText = responseText.replace(/^for\s*\(\s*;\s*;\s*\)\s*;/g, '');
      const lines = cleanText.split('\n').filter(l => l.trim().length > 0);
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.data || data.errors) return data;
        } catch (e) { }
      }
      return JSON.parse(lines[0] || "{}");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function uploadImageFB(file) {
    // 🔥 REFETCH TOKENS MỖI LẦN GỌI
    const tokens = getTokensFromPage();
    
    const formData = new FormData();
    formData.append("source", "8");
    formData.append("profile_id", tokens.c_user);
    formData.append("waterfallxapp", "comet");
    formData.append("upload_id", "jsc_c_" + Math.floor(Math.random() * 1000000));
    formData.append("farr", file);

    const url = `https://www.facebook.com/ajax/react_composer/attachments/photo/upload?av=${tokens.c_user}&__user=${tokens.c_user}&__a=1&fb_dtsg=${tokens.fb_dtsg}&jazoest=${tokens.jazoest}&lsd=${tokens.lsd}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);

      const text = await res.text();
      const jsonStr = text.replace(/^for\s*\(\s*;\s*;\s*\)\s*;/g, '');
      try {
        const data = JSON.parse(jsonStr);
        if (data.payload && data.payload.photoID) {
          return data.payload.photoID;
        }
      } catch (e) { }
      throw new Error("Không thể tải ảnh lên Facebook");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function createGroupPostFB(groupId, text, imageIds) {
    // 🔥 REFETCH TOKENS BẮTBUỘC MỖI LẦN - KHÔNG CACHE
    console.log('[FBToolkit] Refetch tokens trước đăng bài...');
    const tokens = getTokensFromPage();

    const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const variables = {
      "input": {
        "composer_entry_point": "inline_composer",
        "composer_source_surface": "group",
        "composer_type": "group",
        "logging": { "composer_session_id": uuid },
        "source": "WWW",
        "message": { "ranges": [], "text": text },
        "with_tags_ids": null,
        "inline_activities": [],
        "group_flair": { "flair_id": null },
        "navigation_data": {
          "attribution_id_v2": "CometGroupDiscussionRoot.react,comet.group,via_cold_start,1777732956872,745042,2361831622,"
        },
        "tracking": [null],
        "event_share_metadata": { "surface": "newsfeed" },
        "audience": { "to_id": groupId },
        "actor_id": tokens.c_user,
        "client_mutation_id": "1"
      },
      "feedLocation": "GROUP",
      "feedbackSource": 0,
      "focusCommentID": null,
      "gridMediaWidth": null,
      "groupID": null,
      "scale": 1,
      "privacySelectorRenderLocation": "COMET_STREAM",
      "checkPhotosToReelsUpsellEligibility": false,
      "referringStoryRenderLocation": null,
      "renderLocation": "group",
      "useDefaultActor": false,
      "inviteShortLinkKey": null,
      "isFeed": false,
      "isFundraiser": false,
      "isFunFactPost": false,
      "isGroup": true,
      "isEvent": false,
      "isTimeline": false,
      "isSocialLearning": false,
      "isPageNewsFeed": false,
      "isProfileReviews": false,
      "isWorkSharedDraft": false,
      "canUserManageOffers": false,
      "__relay_internal__pv__CometUFIShareActionMigrationrelayprovider": true,
      "__relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider": true,
      "__relay_internal__pv__GHLShouldChangeAdIdFieldNamerelayprovider": true,
      "__relay_internal__pv__CometUFI_dedicated_comment_routable_dialog_gkrelayprovider": true,
      "__relay_internal__pv__CometUFICommentAutoTranslationTyperelayprovider": "AUTO_TRANSLATE",
      "__relay_internal__pv__CometUFICommentAvatarStickerAnimatedImagerelayprovider": false,
      "__relay_internal__pv__CometUFICommentActionLinksRewriteEnabledrelayprovider": false,
      "__relay_internal__pv__IsWorkUserrelayprovider": false,
      "__relay_internal__pv__CometUFIReactionsEnableShortNamerelayprovider": false,
      "__relay_internal__pv__CometUFISingleLineUFIrelayprovider": true,
      "__relay_internal__pv__CometFeedStory_enable_reactor_facepilerelayprovider": false,
      "__relay_internal__pv__CometFeedStory_enable_post_permalink_white_space_clickrelayprovider": false,
      "__relay_internal__pv__TestPilotShouldIncludeDemoAdUseCaserelayprovider": false,
      "__relay_internal__pv__FBReels_deprecate_short_form_video_context_gkrelayprovider": true,
      "__relay_internal__pv__FBReels_enable_view_dubbed_audio_type_gkrelayprovider": true,
      "__relay_internal__pv__CometImmersivePhotoCanUserDisable3DMotionrelayprovider": false,
      "__relay_internal__pv__WorkCometIsEmployeeGKProviderrelayprovider": false,
      "__relay_internal__pv__IsMergQAPollsrelayprovider": false,
      "__relay_internal__pv__FBReelsMediaFooter_comet_enable_reels_ads_gkrelayprovider": true,
      "__relay_internal__pv__FBReelsIFUTileContent_reelsIFUPlayOnHoverrelayprovider": true,
      "__relay_internal__pv__GroupsCometGYSJFeedItemHeightrelayprovider": 206,
      "__relay_internal__pv__ShouldEnableBakedInTextStoriesrelayprovider": false,
      "__relay_internal__pv__StoriesShouldIncludeFbNotesrelayprovider": true,
      "__relay_internal__pv__groups_comet_use_glvrelayprovider": false,
      "__relay_internal__pv__GHLShouldChangeSponsoredAuctionDistanceFieldNamerelayprovider": false,
      "__relay_internal__pv__GHLShouldUseSponsoredAuctionLabelFieldNameV1relayprovider": false,
      "__relay_internal__pv__GHLShouldUseSponsoredAuctionLabelFieldNameV2relayprovider": false
    };

    if (imageIds && imageIds.length > 0) {
      variables.input.attachments = imageIds.map(id => ({ "photo": { "id": id } }));
    }

    const body = new URLSearchParams();
    body.append("av", tokens.c_user);
    body.append("__user", tokens.c_user);
    body.append("__a", "1");
    body.append("__req", "1");
    body.append("__comet_req", "15");
    body.append("fb_dtsg", tokens.fb_dtsg);
    body.append("jazoest", tokens.jazoest);
    body.append("lsd", tokens.lsd);
    body.append("__spin_r", tokens.__spin_r);
    body.append("__spin_b", tokens.__spin_b);
    body.append("__spin_t", tokens.__spin_t);
    body.append("fb_api_caller_class", "RelayModern");
    body.append("fb_api_req_friendly_name", "ComposerStoryCreateMutation");
    body.append("variables", JSON.stringify(variables));
    body.append("server_timestamps", "true");
    body.append("doc_id", "26313541601679894");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch("https://www.facebook.com/api/graphql/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const responseText = await res.text();
      const cleanText = responseText.replace(/^for\s*\(\s*;\s*;\s*\)\s*;/g, '');
      const lines = cleanText.split('\n').filter(l => l.trim().length > 0);
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.data || data.errors) return data;
        } catch (e) { }
      }
      return JSON.parse(lines[0] || "{}");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function initDashboardLogic(shadow) {
    const els = {
      keyword: shadow.getElementById('searchInput'),
      searchBtn: shadow.getElementById('btnSearch'),
      groupsBody: shadow.getElementById('groupsBody'),
      selectAll: shadow.getElementById('selectAll'),
      selectedCount: shadow.getElementById('selectedCount'),
      postContent: shadow.getElementById('postContent'),
      btnStartPost: shadow.getElementById('btnStartPost'),
      btnPausePost: shadow.getElementById('btnPausePost'),
      logContainer: shadow.getElementById('logContainer'),
      postImage: shadow.getElementById('postImage'),
      imageMode: shadow.getElementById('imageMode'),
      btnUploadImage: shadow.getElementById('btnUploadImage'),
      imagePreview: shadow.getElementById('imagePreview'),
      delaySeconds: shadow.getElementById('delaySeconds')
    };

    let currentGroups = [];
    let isPosting = false;
    let isPaused = false;
    let globalImageIds = [];

    function addLog(message, type = 'info') {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      const logItem = document.createElement('div');
      logItem.className = `log-item ${type}`;
      let color = '#e5e7eb';
      if (type === 'success') color = '#34d399';
      if (type === 'error') color = '#ef4444';
      if (type === 'warning') color = '#fbbf24';
      logItem.style.color = color;
      logItem.style.marginBottom = '8px';
      logItem.innerHTML = `<span style="color:#2563eb; font-weight: bold;">[${time}]</span> <span style="color:#1e293b; font-weight: 500;">${message}</span>`;
      els.logContainer.appendChild(logItem);
      els.logContainer.scrollTop = els.logContainer.scrollHeight;
    }

    function renderGroups() {
      if (currentGroups.length === 0) {
        els.groupsBody.innerHTML = '<tr><td colspan="4" class="empty-state">Không tìm thấy nhóm nào phù hợp.</td></tr>';
        return;
      }

      els.groupsBody.innerHTML = currentGroups.map((g, index) => `
        <tr>
          <td><input type="checkbox" class="group-checkbox" data-index="${index}" checked></td>
          <td><strong>${g.name}</strong></td>
          <td><code>${g.id}</code></td>
          <td>${g.members}</td>
        </tr>
      `).join('');

      shadow.querySelectorAll('.group-checkbox').forEach(cb => {
        cb.addEventListener('change', updateSelection);
      });

      els.selectAll.checked = true;
      updateSelection();
    }

    function updateSelection() {
      const checked = shadow.querySelectorAll('.group-checkbox:checked').length;
      els.selectedCount.textContent = `Đã chọn: ${checked} nhóm`;
    }

    els.selectAll.addEventListener('change', (e) => {
      shadow.querySelectorAll('.group-checkbox').forEach(cb => {
        cb.checked = e.target.checked;
      });
      updateSelection();
    });

    els.searchBtn.addEventListener('click', async () => {
      const keyword = els.keyword.value.trim();
      if (!keyword) return alert('Vui lòng nhập từ khóa tìm kiếm (Ví dụ: mua bán acc fifa)');

      els.searchBtn.disabled = true;
      els.searchBtn.textContent = 'Đang quét...';
      els.groupsBody.innerHTML = '<tr><td colspan="4" class="empty-state" style="color:#60a5fa">Đang quét nhóm trực tiếp trên Facebook... Vui lòng đợi.</td></tr>';
      currentGroups = [];
      updateSelection();

      try {
        const response = await searchGroupsFB(keyword);
        if (response.errors) {
          throw new Error("FB API Error: " + JSON.stringify(response.errors[0]));
        }
        if (!response.data) {
          throw new Error("Không có data trả về. (RAW: " + JSON.stringify(response).substring(0, 100) + "...)");
        }
        const serpData = response.data.serpResponse || response.data.serpBase;
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
                members: group.group_member_count ? `${(group.group_member_count / 1000).toFixed(1)}K` : 'Không rõ'
              });
            }
          }
        });

        renderGroups();
        addLog(`Quét thành công ${currentGroups.length} nhóm.`, 'success');
      } catch (e) {
        addLog(`Lỗi quét nhóm: ${e.message}`, 'error');
        els.groupsBody.innerHTML = '<tr><td colspan="4" class="empty-state" style="color:#ef4444">Không thể phân tích dữ liệu. Xem nhật ký.</td></tr>';
      } finally {
        els.searchBtn.disabled = false;
        els.searchBtn.textContent = 'Quét Nhóm';
      }
    });

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

    els.btnUploadImage?.addEventListener('click', async () => {
      const files = els.postImage.files;
      if (files.length === 0) return alert('Vui lòng chọn ít nhất 1 ảnh trước khi tải lên!');

      els.btnUploadImage.disabled = true;
      els.btnUploadImage.textContent = 'Đang tải...';
      globalImageIds = [];
      els.imagePreview.style.display = 'block';
      els.imagePreview.innerHTML = `Đang tải ${files.length} ảnh...`;

      let successCount = 0;
      try {
        for (let i = 0; i < files.length; i++) {
          addLog(`Đang tải ảnh ${i + 1}/${files.length} ("${files[i].name}")...`, 'info');
          const id = await uploadImageFB(files[i]);
          globalImageIds.push(id);
          successCount++;
          els.imagePreview.innerHTML = `Đã tải ${successCount}/${files.length} ảnh...`;
        }

        els.imagePreview.innerHTML = `✅ Đã tải thành công ${successCount} ảnh!<br><span style="color:#059669">Bây giờ bạn có thể bắt đầu Đăng Hàng Loạt.</span>`;
        addLog(`✅ Tải xong ${successCount} ảnh!`, 'success');
      } catch (err) {
        els.imagePreview.innerHTML = `❌ Lỗi tải ảnh: ${err.message}<br>Đã tải được ${successCount} ảnh.`;
        addLog(`❌ Lỗi tải ảnh: ${err.message}`, 'error');
      } finally {
        els.btnUploadImage.disabled = false;
        els.btnUploadImage.textContent = 'Tải Ảnh Lên';
      }
    });

    els.btnPausePost?.addEventListener('click', () => {
      if (!isPosting) return;
      isPaused = !isPaused;
      if (isPaused) {
        els.btnPausePost.textContent = '▶ Tiếp Tục';
        els.btnPausePost.style.background = '#10b981';
        addLog('⏸ Đã tạm dừng quá trình đăng bài!', 'warning');
      } else {
        els.btnPausePost.textContent = '⏸ Tạm Dừng';
        els.btnPausePost.style.background = '#f59e0b';
        addLog('▶ Tiếp tục đăng bài...', 'info');
      }
    });

    els.btnStartPost.addEventListener('click', async () => {
      if (isPosting) return;
      const checkedBoxes = shadow.querySelectorAll('.group-checkbox:checked');
      if (checkedBoxes.length === 0) return alert('Vui lòng chọn ít nhất 1 nhóm để đăng!');

      const rawContent = els.postContent.value.trim();
      if (!rawContent) return alert('Vui lòng nhập nội dung bài viết!');

      const delaySecs = parseInt(els.delaySeconds.value) || 60;

      let targetGroups = Array.from(checkedBoxes).map(cb => currentGroups[cb.dataset.index]);

      els.btnStartPost.disabled = true;
      if (els.btnPausePost) {
        els.btnPausePost.style.display = 'block';
        els.btnPausePost.textContent = '⏸ Tạm Dừng';
        els.btnPausePost.style.background = '#f59e0b';
      }
      isPosting = true;
      isPaused = false;

      const imageMode = els.imageMode ? els.imageMode.value : 'random';

      addLog(`Bắt đầu chiến dịch đăng vào ${targetGroups.length} nhóm. Tần suất: ${delaySecs}s/bài...`, 'info');

      for (let i = 0; i < targetGroups.length; i++) {
        while (isPaused) {
          await new Promise(r => setTimeout(r, 1000));
        }
        const group = targetGroups[i];
        const spunContent = spinText(rawContent);

        let currentImageIds = [];
        if (globalImageIds.length > 0) {
          if (imageMode === 'sequential') {
            const seqIdx = i % globalImageIds.length;
            currentImageIds = [globalImageIds[seqIdx]];
          } else {
            const randIdx = Math.floor(Math.random() * globalImageIds.length);
            currentImageIds = [globalImageIds[randIdx]];
          }
        }

        els.btnStartPost.textContent = `⏳ Đang đăng (${i + 1}/${targetGroups.length})...`;
        addLog(`[${i + 1}/${targetGroups.length}] Đang gửi bài: "${spunContent.substring(0, 30)}..." vào "${group.name}"...`, 'warning');

        try {
          const response = await createGroupPostFB(group.id, spunContent, currentImageIds);

          if (response.errors) {
            throw new Error(response.errors[0].message || "FB chặn hành động");
          }

          if (response.data && response.data.story_create) {
            addLog(`✅ Đăng thành công vào "${group.name}"!`, 'success');
          } else {
            addLog(`⚠️ Đăng nghi vấn thất bại vào "${group.name}".`, 'warning');
          }
        } catch (e) {
          addLog(`❌ Lỗi đăng nhóm "${group.name}": ${e.message}`, 'error');
        }

        if (i < targetGroups.length - 1) {
          let waitTime = delaySecs;
          while (waitTime > 0) {
            if (!isPaused) {
              els.btnStartPost.textContent = `⏳ Đang chờ ${waitTime}s... (${i + 1}/${targetGroups.length})`;
              waitTime--;
            }
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }

      isPosting = false;
      if (els.btnPausePost) els.btnPausePost.style.display = 'none';
      els.btnStartPost.disabled = false;
      els.btnStartPost.textContent = '🚀 Bắt Đầu Đăng Hàng Loạt';
      addLog('🎉 Đã hoàn tất tiến trình đăng bài!', 'success');
    });
  }
}
