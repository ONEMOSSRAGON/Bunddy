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
    // ========== SETTINGS STORAGE KEYS ==========
    const STORAGE_KEYS = {
      oldAcc: 'fbtoolkit_old_account_settings',
      cloneAcc: 'fbtoolkit_clone_account_settings',
      currentAccountType: 'fbtoolkit_current_account_type'
    };

    function getStorageKey(accountType) {
      return accountType === 'old-account' ? STORAGE_KEYS.oldAcc : STORAGE_KEYS.cloneAcc;
    }

    // ========== TAB SWITCHING - SHADOW DOM FIX ==========
    const tabBtns = shadow.querySelectorAll('.tab-btn');
    const tabContents = shadow.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        btn.classList.add('active');
        
        const targetTab = shadow.getElementById(`${tabName}-tab`);
        if (targetTab) {
          targetTab.classList.add('active');
        }
      });
    });

    // ========== ACCOUNT TYPE SELECTOR - SHADOW DOM FIX ==========
    const accountTypeBtns = shadow.querySelectorAll('.account-type-btn');
    const accountSettingsPanels = shadow.querySelectorAll('.account-settings-panel');

    accountTypeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const accountType = btn.getAttribute('data-type');
        
        accountTypeBtns.forEach(b => b.classList.remove('active'));
        accountSettingsPanels.forEach(panel => panel.style.display = 'none');
        
        btn.classList.add('active');
        
        // 🔥 Lưu loại tài khoản hiện tại
        chrome.storage.local.set({ [STORAGE_KEYS.currentAccountType]: accountType });
        
        const targetPanel = shadow.getElementById(`${accountType}-settings`);
        if (targetPanel) {
          targetPanel.style.display = 'block';
        }
        
        loadSettings(shadow, accountType);
        updateDelayInput(shadow, accountType);
      });
    });

    function loadSettings(shadowRoot, accountType) {
      const key = getStorageKey(accountType);
      chrome.storage.local.get([key], (result) => {
        const settings = result[key] || {};
        
        if (accountType === 'old-account') {
          shadowRoot.getElementById('oldAccMinDelay').value = settings.minDelay || 60;
          shadowRoot.getElementById('oldAccMaxDelay').value = settings.maxDelay || 180;
          shadowRoot.getElementById('oldAccMaxPostsPerDay').value = settings.maxPostsPerDay || 20;
          shadowRoot.getElementById('oldAccSafeMode').checked = settings.safeMode !== false;
          shadowRoot.getElementById('oldAccErrorDelay').value = settings.errorDelay || 300;
          shadowRoot.getElementById('oldAccMaxRetry').value = settings.maxRetry || 3;
        } else {
          shadowRoot.getElementById('cloneAccMinDelay').value = settings.minDelay || 20;
          shadowRoot.getElementById('cloneAccMaxDelay').value = settings.maxDelay || 90;
          shadowRoot.getElementById('cloneAccMaxPostsPerDay').value = settings.maxPostsPerDay || 50;
          shadowRoot.getElementById('cloneAccWarmupMode').checked = settings.warmupMode !== false;
          shadowRoot.getElementById('cloneAccWarmupDays').value = settings.warmupDays || 3;
          shadowRoot.getElementById('cloneAccWarmupMaxPosts').value = settings.warmupMaxPosts || 10;
          shadowRoot.getElementById('cloneAccErrorDelay').value = settings.errorDelay || 180;
          shadowRoot.getElementById('cloneAccMaxRetry').value = settings.maxRetry || 2;
          shadowRoot.getElementById('cloneAccAggressive').value = settings.aggressive || 'normal';
        }
      });
    }

    // 🔥 HÀM MỚI: Cập nhật Delay Input từ Settings
    function updateDelayInput(shadowRoot, accountType) {
      const key = getStorageKey(accountType);
      chrome.storage.local.get([key], (result) => {
        const settings = result[key] || {};
        const delayInput = shadowRoot.getElementById('delaySeconds');
        
        if (accountType === 'old-account') {
          const avgDelay = Math.floor(((settings.minDelay || 60) + (settings.maxDelay || 180)) / 2);
          delayInput.value = avgDelay;
        } else {
          const avgDelay = Math.floor(((settings.minDelay || 20) + (settings.maxDelay || 90)) / 2);
          delayInput.value = avgDelay;
        }
      });
    }

    function saveSettings(shadowRoot, accountType) {
      const key = getStorageKey(accountType);
      let settings = {};
      
      if (accountType === 'old-account') {
        settings = {
          minDelay: parseInt(shadowRoot.getElementById('oldAccMinDelay').value),
          maxDelay: parseInt(shadowRoot.getElementById('oldAccMaxDelay').value),
          maxPostsPerDay: parseInt(shadowRoot.getElementById('oldAccMaxPostsPerDay').value),
          safeMode: shadowRoot.getElementById('oldAccSafeMode').checked,
          errorDelay: parseInt(shadowRoot.getElementById('oldAccErrorDelay').value),
          maxRetry: parseInt(shadowRoot.getElementById('oldAccMaxRetry').value)
        };
      } else {
        settings = {
          minDelay: parseInt(shadowRoot.getElementById('cloneAccMinDelay').value),
          maxDelay: parseInt(shadowRoot.getElementById('cloneAccMaxDelay').value),
          maxPostsPerDay: parseInt(shadowRoot.getElementById('cloneAccMaxPostsPerDay').value),
          warmupMode: shadowRoot.getElementById('cloneAccWarmupMode').checked,
          warmupDays: parseInt(shadowRoot.getElementById('cloneAccWarmupDays').value),
          warmupMaxPosts: parseInt(shadowRoot.getElementById('cloneAccWarmupMaxPosts').value),
          errorDelay: parseInt(shadowRoot.getElementById('cloneAccErrorDelay').value),
          maxRetry: parseInt(shadowRoot.getElementById('cloneAccMaxRetry').value),
          aggressive: shadowRoot.getElementById('cloneAccAggressive').value
        };
      }
      
      chrome.storage.local.set({ [key]: settings }, () => {
        showFeedback(shadowRoot, '✅ Lưu cài đặt thành công!', 'success');
        // 🔥 Cập nhật delay input ngay sau khi lưu
        updateDelayInput(shadowRoot, accountType);
      });
    }

    function resetSettings(shadowRoot, accountType) {
      const key = getStorageKey(accountType);
      chrome.storage.local.remove([key], () => {
        loadSettings(shadowRoot, accountType);
        updateDelayInput(shadowRoot, accountType);
        showFeedback(shadowRoot, '🔄 Khôi phục mặc định thành công!', 'warning');
      });
    }

    function showFeedback(shadowRoot, message, type) {
      const feedbackEl = shadowRoot.getElementById('settingsFeedback');
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
    const btnSaveSettings = shadow.getElementById('btnSaveSettings');
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => {
        const activeAccountType = shadow.querySelector('.account-type-btn.active')?.getAttribute('data-type');
        if (activeAccountType) {
          saveSettings(shadow, activeAccountType);
        }
      });
    }

    // Reset button
    const btnResetSettings = shadow.getElementById('btnResetSettings');
    if (btnResetSettings) {
      btnResetSettings.addEventListener('click', () => {
        const activeAccountType = shadow.querySelector('.account-type-btn.active')?.getAttribute('data-type');
        if (activeAccountType && confirm('Bạn chắc chắn muốn khôi phục mặc định?')) {
          resetSettings(shadow, activeAccountType);
        }
      });
    }

    // ========== MAIN POSTING LOGIC ==========
    const btnSearch = shadow.getElementById('btnSearch');
    const searchInput = shadow.getElementById('searchInput');
    const groupsBody = shadow.getElementById('groupsBody');
    const selectAll = shadow.getElementById('selectAll');
    const selectedCount = shadow.getElementById('selectedCount');
    const btnStartPost = shadow.getElementById('btnStartPost');
    const logContainer = shadow.getElementById('logContainer');

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

      // 🔥 Gọi hàm tìm kiếm trực tiếp thay vì qua background
      searchGroupsFB(keyword).then(response => {
        btnSearch.disabled = false;
        btnSearch.textContent = 'Quét Nhóm';

        try {
          if (response.errors) {
            throw new Error("FB API Error: " + JSON.stringify(response.errors[0]));
          }
          if (!response.data) {
            console.error("RAW FB RESPONSE:", response);
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
      }).catch(err => {
        btnSearch.disabled = false;
        btnSearch.textContent = 'Quét Nhóm';
        addLog(`Lỗi tìm kiếm: ${err.message}`, 'error');
        groupsBody.innerHTML = '<tr><td colspan="4" class="empty-state">Đã xảy ra lỗi khi quét.</td></tr>';
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

      shadow.querySelectorAll('.group-checkbox').forEach(cb => {
        cb.addEventListener('change', updateSelection);
      });
      
      selectAll.checked = true;
      updateSelection();
    }

    selectAll.addEventListener('change', (e) => {
      shadow.querySelectorAll('.group-checkbox').forEach(cb => {
        cb.checked = e.target.checked;
      });
      updateSelection();
    });

    function updateSelection() {
      const checked = shadow.querySelectorAll('.group-checkbox:checked').length;
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

    // 🔥 HÀM LƯỚI DELAY TỪ SETTINGS
    function getRandomDelay(accountType) {
      return new Promise((resolve) => {
        const key = getStorageKey(accountType);
        chrome.storage.local.get([key], (result) => {
          const settings = result[key] || {};
          let minDelay, maxDelay;
          
          if (accountType === 'old-account') {
            minDelay = settings.minDelay || 60;
            maxDelay = settings.maxDelay || 180;
          } else {
            minDelay = settings.minDelay || 20;
            maxDelay = settings.maxDelay || 90;
          }
          
          const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          resolve(delay);
        });
      });
    }

    btnStartPost.addEventListener('click', async () => {
      const checkedBoxes = shadow.querySelectorAll('.group-checkbox:checked');
      if (checkedBoxes.length === 0) return alert('Vui lòng chọn ít nhất 1 nhóm để đăng!');
      
      const rawContent = shadow.getElementById('postContent').value.trim();
      if (!rawContent) return alert('Vui lòng nhập nội dung bài viết!');

      // 🔥 PHÁT HIỆN LOẠI TÀI KHOẢN ĐANG CHỌN
      const activeAccountType = shadow.querySelector('.account-type-btn.active')?.getAttribute('data-type') || 'old-account';

      let targetGroups = Array.from(checkedBoxes).map(cb => currentGroups[cb.dataset.index]);

      btnStartPost.disabled = true;
      addLog(`🎯 Chế độ: ${activeAccountType === 'old-account' ? 'Nick Cũ 👴' : 'Nick Clone 👯'}`, 'info');
      addLog(`Bắt đầu chiến dịch đăng vào ${targetGroups.length} nhóm...`, 'info');

      for (let i = 0; i < targetGroups.length; i++) {
        const group = targetGroups[i];
        const spunContent = spinText(rawContent);
        
        addLog(`[${i+1}/${targetGroups.length}] Đang gửi bài: "${spunContent.substring(0, 30)}..." vào "${group.name}"...`, 'warning');
        
        const success = await new Promise(resolve => {
          chrome.runtime.sendMessage({
            action: 'createPost',
            groupId: group.id,
            text: spunContent
          }, response => {
            if (response && response.success && !response.data.errors) {
              resolve(true);
            } else {
              addLog(`❌ Chi tiết lỗi FB: ${JSON.stringify(response?.data?.errors || response?.error || 'Unknown')}`, 'error');
              resolve(false);
            }
          });
        });

        if (success) {
          addLog(`✅ Đăng thành công vào nhóm "${group.name}"!`, 'success');
        } else {
          addLog(`❌ Thất bại khi đăng vào nhóm "${group.name}".`, 'error');
        }

        if (i < targetGroups.length - 1) {
          // 🔥 LẤY DELAY TỪ SETTINGS
          const dynamicDelay = await getRandomDelay(activeAccountType);
          addLog(`⏳ Chờ ${dynamicDelay} giây (Delay tự động từ cài đặt)...`, 'warning');
          await new Promise(r => setTimeout(r, dynamicDelay * 1000));
        }
      }

      addLog('🎉 Chiến dịch đăng bài đã hoàn tất thành công!', 'success');
      btnStartPost.disabled = false;
    });

    // Load initial settings
    const firstAccountType = shadow.querySelector('.account-type-btn.active')?.getAttribute('data-type');
    if (firstAccountType) {
      loadSettings(shadow, firstAccountType);
      updateDelayInput(shadow, firstAccountType);
    }
  }
}
