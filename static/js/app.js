/**
 * BigQuery Release Notes Radar - Frontend Logic (Vanilla JS)
 */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let state = {
        feedTitle: 'BigQuery Release Notes',
        feedUpdated: '',
        allReleases: [],      // Array of parsed update items
        filteredReleases: [], // Filtered subset of items
        selectedItemId: null, // Currently selected update item ID
        currentFilter: 'all', // active type filter
        searchQuery: '',      // active search text
        isLoading: false
    };

    // DOM Elements
    const elements = {
        refreshBtn: document.getElementById('refresh-btn'),
        refreshIcon: document.getElementById('refresh-icon'),
        lastFetchVal: document.getElementById('last-fetch-val'),
        
        // Stats
        statTotalReleases: document.getElementById('stat-total-releases'),
        statFeatures: document.getElementById('stat-features'),
        statIssuesChanges: document.getElementById('stat-issues-changes'),
        statLatestDate: document.getElementById('stat-latest-date'),
        
        // Search & Filters
        searchInput: document.getElementById('search-input'),
        clearSearchBtn: document.getElementById('clear-search-btn'),
        filterTags: document.querySelectorAll('.filter-tag'),
        clearAllFiltersBtn: document.getElementById('clear-all-filters-btn'),
        
        // Feed States
        feedLoading: document.getElementById('feed-loading'),
        feedError: document.getElementById('feed-error'),
        feedEmpty: document.getElementById('feed-empty'),
        errorMessage: document.getElementById('error-message'),
        retryBtn: document.getElementById('retry-btn'),
        releaseList: document.getElementById('release-list'),
        
        // Composer
        composerEmpty: document.getElementById('composer-empty'),
        composerActive: document.getElementById('composer-active'),
        closeComposerBtn: document.getElementById('close-composer-btn'),
        compPreviewDate: document.getElementById('comp-preview-date'),
        compPreviewBadge: document.getElementById('comp-preview-badge'),
        compPreviewText: document.getElementById('comp-preview-text'),
        tweetTextarea: document.getElementById('tweet-textarea'),
        composerRefineBtn: document.getElementById('composer-refine-btn'),
        composerShortenBtn: document.getElementById('composer-shorten-btn'),
        charProgressCircle: document.getElementById('char-progress-circle'),
        charCounter: document.getElementById('char-counter'),
        tweetSubmitBtn: document.getElementById('tweet-submit-btn'),
        
        // Toast
        toastContainer: document.getElementById('toast-container')
    };

    // Progress ring constant
    const CIRCUMFERENCE = 2 * Math.PI * 14; // r = 14
    elements.charProgressCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;

    /* ==========================================================================
       Feed Parsing & Loading
       ========================================================================== */

    async function loadReleaseNotes() {
        if (state.isLoading) return;
        setLoadingState(true);

        try {
            const response = await fetch('/api/release-notes');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.status === 'error') {
                throw new Error(data.message);
            }

            state.feedTitle = data.feed_title;
            state.feedUpdated = data.feed_updated;
            
            // Process and flatten entry HTML details into individual update items
            state.allReleases = [];
            data.entries.forEach(entry => {
                const parsedUpdates = parseEntryUpdates(entry);
                state.allReleases.push(...parsedUpdates);
            });

            // Update Fetch Time UI
            const now = new Date();
            elements.lastFetchVal.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            // Render
            updateStats();
            applyFiltersAndRender();
            showNotification('Successfully synced latest BigQuery release notes.', 'success');
            
        } catch (error) {
            console.error('Error loading release notes:', error);
            elements.errorMessage.textContent = error.message || 'Connection failed. Please check backend server.';
            setFeedOverlay('error');
        } finally {
            setLoadingState(false);
        }
    }

    // Helper to normalize the category/type name
    function normalizeType(type) {
        const t = type.trim().toLowerCase();
        if (t.includes('feature')) return 'Feature';
        if (t.includes('issue') || t.includes('bug') || t.includes('known issue')) return 'Issue';
        if (t.includes('change') || t.includes('update')) return 'Changed';
        if (t.includes('resolv') || t.includes('fix')) return 'Resolved';
        if (t.includes('deprecat')) return 'Deprecated';
        return type.trim(); // Default fallback
    }

    // Parse HTML release notes content into sub-items
    function parseEntryUpdates(entry) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(entry.content, 'text/html');
        const children = Array.from(doc.body.children);
        
        const updates = [];
        let currentUpdate = null;
        
        if (children.length === 0) {
            return [{
                id: `${entry.id}_0`,
                date: entry.title,
                type: 'Update',
                html: entry.content || '<p>No details provided.</p>',
                text: 'No details provided.'
            }];
        }
        
        children.forEach((el) => {
            if (el.tagName === 'H3' || el.tagName === 'H4') {
                if (currentUpdate) {
                    updates.push(currentUpdate);
                }
                currentUpdate = {
                    id: `${entry.id}_${updates.length}`,
                    date: entry.title,
                    type: el.textContent.trim(),
                    elements: [],
                    textElements: []
                };
            } else {
                if (!currentUpdate) {
                    // Content before any header is found
                    currentUpdate = {
                        id: `${entry.id}_0`,
                        date: entry.title,
                        type: 'Update',
                        elements: [],
                        textElements: []
                    };
                }
                currentUpdate.elements.push(el.outerHTML);
                currentUpdate.textElements.push(el.textContent.trim());
            }
        });
        
        if (currentUpdate) {
            updates.push(currentUpdate);
        }
        
        return updates.map(up => {
            const html = up.elements.join('\n');
            const text = up.textElements.join(' ').replace(/\s+/g, ' ').trim();
            return {
                id: up.id,
                date: up.date,
                type: normalizeType(up.type),
                html: html || `<p>${up.type}</p>`,
                text: text || up.type
            };
        });
    }

    /* ==========================================================================
       Rendering & Filtering
       ========================================================================== */

    function applyFiltersAndRender() {
        const query = state.searchQuery.toLowerCase();
        
        state.filteredReleases = state.allReleases.filter(item => {
            // Apply category filter
            const matchesFilter = state.currentFilter === 'all' || item.type === state.currentFilter;
            // Apply search query
            const matchesSearch = !query || 
                item.text.toLowerCase().includes(query) || 
                item.date.toLowerCase().includes(query) || 
                item.type.toLowerCase().includes(query);
                
            return matchesFilter && matchesSearch;
        });

        renderFeed();
    }

    function renderFeed() {
        elements.releaseList.innerHTML = '';
        
        if (state.filteredReleases.length === 0) {
            setFeedOverlay('empty');
            return;
        }
        
        setFeedOverlay('list');
        
        // Group updates by date for the timeline UI
        const groupedByDate = {};
        state.filteredReleases.forEach(item => {
            if (!groupedByDate[item.date]) {
                groupedByDate[item.date] = [];
            }
            groupedByDate[item.date].push(item);
        });

        // Loop over dates and build DOM elements
        Object.keys(groupedByDate).forEach(date => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'release-day-group';
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'release-date-header';
            headerDiv.innerHTML = `
                <div class="timeline-node"></div>
                <h2 class="release-date-title">${date}</h2>
            `;
            groupDiv.appendChild(headerDiv);
            
            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'release-day-items';
            
            groupedByDate[date].forEach(item => {
                const card = document.createElement('div');
                card.className = `update-card ${state.selectedItemId === item.id ? 'selected' : ''}`;
                card.setAttribute('data-id', item.id);
                card.setAttribute('data-item-type', item.type);
                
                const typeClass = item.type.toLowerCase();
                
                card.innerHTML = `
                    <div class="update-card-header">
                        <span class="update-badge ${typeClass}">${item.type}</span>
                        <button class="tweet-shortcut-btn" title="Compose Tweet for this update" data-id="${item.id}">
                            <svg class="twitter-icon" viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px;">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="update-card-body">
                        ${item.html}
                    </div>
                `;
                
                // Add click listener to select item
                card.addEventListener('click', (e) => {
                    // Prevent trigger if they click the tweet button directly
                    if (e.target.closest('.tweet-shortcut-btn')) return;
                    selectItem(item);
                });
                
                // Tweet button inside card
                card.querySelector('.tweet-shortcut-btn').addEventListener('click', () => {
                    selectItem(item);
                    focusComposer();
                });
                
                itemsDiv.appendChild(card);
            });
            
            groupDiv.appendChild(itemsDiv);
            elements.releaseList.appendChild(groupDiv);
        });
    }

    function selectItem(item) {
        state.selectedItemId = item.id;
        
        // Update selection styling in the feed
        document.querySelectorAll('.update-card').forEach(card => {
            if (card.getAttribute('data-id') === item.id) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        
        // Open/Update Composer
        openComposer(item);
    }

    function updateStats() {
        // Find total number of unique release days
        const uniqueDates = new Set(state.allReleases.map(r => r.date));
        elements.statTotalReleases.textContent = uniqueDates.size;
        
        // Count Features
        const features = state.allReleases.filter(r => r.type === 'Feature').length;
        elements.statFeatures.textContent = features;
        
        // Count Issues & Changes
        const issuesChanges = state.allReleases.filter(r => r.type === 'Issue' || r.type === 'Changed').length;
        elements.statIssuesChanges.textContent = issuesChanges;
        
        // Latest Release Date
        if (state.allReleases.length > 0) {
            elements.statLatestDate.textContent = state.allReleases[0].date;
        } else {
            elements.statLatestDate.textContent = '-';
        }
    }

    function setLoadingState(loading) {
        state.isLoading = loading;
        if (loading) {
            elements.refreshIcon.classList.add('spin-animation');
            elements.refreshBtn.disabled = true;
            setFeedOverlay('loading');
        } else {
            elements.refreshIcon.classList.remove('spin-animation');
            elements.refreshBtn.disabled = false;
        }
    }

    function setFeedOverlay(stateType) {
        elements.feedLoading.classList.add('hidden');
        elements.feedError.classList.add('hidden');
        elements.feedEmpty.classList.add('hidden');
        elements.releaseList.classList.add('hidden');
        
        if (stateType === 'loading') {
            elements.feedLoading.classList.remove('hidden');
        } else if (stateType === 'error') {
            elements.feedError.classList.remove('hidden');
        } else if (stateType === 'empty') {
            elements.feedEmpty.classList.remove('hidden');
        } else if (stateType === 'list') {
            elements.releaseList.classList.remove('hidden');
        }
    }

    /* ==========================================================================
       Tweet Composer
       ========================================================================== */

    function openComposer(item) {
        // Load details
        elements.compPreviewDate.textContent = item.date;
        
        const badge = elements.compPreviewBadge;
        badge.textContent = item.type;
        badge.className = `badge ${item.type.toLowerCase()}`;
        
        elements.compPreviewText.textContent = item.text;
        
        // Generate Default Tweet Text
        const defaultTweet = generateDefaultTweet(item.type, item.date, item.text);
        elements.tweetTextarea.value = defaultTweet;
        
        // Reveal composer active panel
        elements.composerEmpty.classList.add('hidden');
        elements.composerActive.classList.remove('hidden');
        
        updateCharCounter();
    }

    function closeComposer() {
        state.selectedItemId = null;
        document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
        
        elements.composerActive.classList.add('hidden');
        elements.composerEmpty.classList.remove('hidden');
    }

    function focusComposer() {
        elements.tweetTextarea.focus();
        elements.tweetTextarea.select();
    }

    function generateDefaultTweet(type, date, textContent) {
        const prefix = `📢 BigQuery ${type} (${date}): `;
        const suffix = ` #BigQuery #GoogleCloud`;
        const maxBodyLength = 280 - prefix.length - suffix.length - 4; // 4 for "..."
        
        // Clean white spaces
        let body = textContent.replace(/\s+/g, ' ').trim();
        
        if (body.length > maxBodyLength) {
            body = body.substring(0, maxBodyLength) + '...';
        }
        
        return `${prefix}${body}${suffix}`;
    }

    function updateCharCounter() {
        const text = elements.tweetTextarea.value;
        const count = text.length;
        const remaining = 280 - count;
        
        elements.charCounter.textContent = remaining;
        
        // Progress Ring Calculation
        const circle = elements.charProgressCircle;
        const percentage = Math.min(100, (count / 280) * 100);
        const offset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;
        circle.style.strokeDashoffset = offset;
        
        // Style changes depending on capacity
        if (remaining < 0) {
            elements.charCounter.className = 'char-count-text error';
            circle.style.stroke = 'var(--color-red)';
            elements.tweetSubmitBtn.disabled = true;
        } else if (remaining <= 20) {
            elements.charCounter.className = 'char-count-text warn';
            circle.style.stroke = 'var(--color-yellow)';
            elements.tweetSubmitBtn.disabled = false;
        } else {
            elements.charCounter.className = 'char-count-text';
            circle.style.stroke = 'var(--color-blue)';
            elements.tweetSubmitBtn.disabled = false;
        }
        
        // Disable post button for empty text
        if (count === 0) {
            elements.tweetSubmitBtn.disabled = true;
        }
    }

    function handleTweetSubmit() {
        const tweetText = elements.tweetTextarea.value.trim();
        if (!tweetText || tweetText.length > 280) return;
        
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
        showNotification('Redirecting to X/Twitter composer...', 'success');
    }

    function handleShortenTweet() {
        let text = elements.tweetTextarea.value;
        
        // If it's already within limits, do nothing
        if (text.length <= 280) {
            showNotification('Tweet is already within the 280 character limit.', 'info');
            return;
        }
        
        // Find current selected item details to regenerate a truncated version
        const selectedItem = state.allReleases.find(r => r.id === state.selectedItemId);
        if (selectedItem) {
            const shorterTweet = generateDefaultTweet(selectedItem.type, selectedItem.date, selectedItem.text);
            elements.tweetTextarea.value = shorterTweet;
            updateCharCounter();
            showNotification('Tweet draft auto-shortened to fit limit.', 'success');
        } else {
            // General hard truncation fallback
            const prefix = text.substring(0, 260);
            elements.tweetTextarea.value = prefix + '... #BigQuery';
            updateCharCounter();
        }
    }

    function handleResetDraft() {
        const selectedItem = state.allReleases.find(r => r.id === state.selectedItemId);
        if (selectedItem) {
            const defaultTweet = generateDefaultTweet(selectedItem.type, selectedItem.date, selectedItem.text);
            elements.tweetTextarea.value = defaultTweet;
            updateCharCounter();
            showNotification('Draft reset to original template.', 'info');
        }
    }

    /* ==========================================================================
       Search & Filter Events
       ========================================================================== */

    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (state.searchQuery) {
            elements.clearSearchBtn.style.display = 'flex';
        } else {
            elements.clearSearchBtn.style.display = 'none';
        }
        applyFiltersAndRender();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        applyFiltersAndRender();
        elements.searchInput.focus();
    });

    elements.filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            elements.filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            
            state.currentFilter = tag.getAttribute('data-type');
            applyFiltersAndRender();
        });
    });

    elements.clearAllFiltersBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        
        elements.filterTags.forEach(t => t.classList.remove('active'));
        document.querySelector('.filter-tag[data-type="all"]').classList.add('active');
        state.currentFilter = 'all';
        
        applyFiltersAndRender();
    });

    /* ==========================================================================
       General UI Helpers
       ========================================================================== */

    function showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'info';
        if (type === 'success') icon = 'check_circle';
        if (type === 'error') icon = 'error';
        
        toast.innerHTML = `
            <span class="material-symbols-outlined">${icon}</span>
            <span>${message}</span>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // Remove from DOM after transition completes (3.5s total duration matching CSS)
        setTimeout(() => {
            toast.remove();
        }, 3500);
    }

    /* ==========================================================================
       Setup Listeners & Start
       ========================================================================== */

    elements.refreshBtn.addEventListener('click', loadReleaseNotes);
    elements.retryBtn.addEventListener('click', loadReleaseNotes);
    elements.closeComposerBtn.addEventListener('click', closeComposer);
    elements.tweetTextarea.addEventListener('input', updateCharCounter);
    elements.tweetSubmitBtn.addEventListener('click', handleTweetSubmit);
    elements.composerShortenBtn.addEventListener('click', handleShortenTweet);
    elements.composerRefineBtn.addEventListener('click', handleResetDraft);

    // Initial Load
    loadReleaseNotes();
});
