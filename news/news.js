// 최근뉴스 화면 전용 스크립트 (news/CLAUDE.md 규칙 적용)
// SUPABASE_NEWS_FUNCTION_URL, SUPABASE_ANON_KEY는 config.js에서 전역으로 제공된다.

// TODO(미확정, 기술명세서.md 10번 / prd.md OQ-2): 검색 키워드 전략이 아직 확정되지 않았다.
// 확정 전까지 임시로 '경제' 단일 키워드를 사용한다.
const DEFAULT_NEWS_KEYWORD = '경제';

const NEWS_FETCH_TIMEOUT_MS = 5000;

function fetchRecentNews(keyword) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NEWS_FETCH_TIMEOUT_MS);

  return fetch(SUPABASE_NEWS_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ keyword }),
    signal: controller.signal,
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`naver-news 호출 실패 (status ${res.status})`);
      }
      return res.json();
    })
    .finally(() => clearTimeout(timeoutId));
}

function stripHtmlTags(str) {
  return (str || '').replace(/<[^>]+>/g, '');
}

function buildNewsCard(item) {
  const card = document.createElement('article');
  card.className = 'news-card';

  const title = document.createElement('h3');
  title.className = 'news-card-title';
  title.textContent = stripHtmlTags(item.title);

  const desc = document.createElement('p');
  desc.className = 'news-card-desc';
  desc.textContent = stripHtmlTags(item.description);

  const footer = document.createElement('div');
  footer.className = 'news-card-footer';

  const date = document.createElement('time');
  date.className = 'news-card-date';
  date.textContent = item.pubDate;

  const link = document.createElement('a');
  link.className = 'news-card-link';
  link.textContent = '원문보기';
  link.href = item.link;
  link.target = '_blank';
  link.rel = 'noopener';

  footer.appendChild(date);
  footer.appendChild(link);

  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(footer);

  return card;
}

function renderNewsList(items) {
  const listEl = document.getElementById('newsList');
  if (!listEl) return;

  listEl.innerHTML = '';
  items.forEach(item => {
    listEl.appendChild(buildNewsCard(item));
  });
}

function renderNewsMessage(text) {
  const listEl = document.getElementById('newsList');
  if (!listEl) return;

  listEl.innerHTML = '';
  const msg = document.createElement('p');
  msg.className = 'news-empty';
  msg.textContent = text;
  listEl.appendChild(msg);
}

function renderNewsLoading() {
  renderNewsMessage('불러오는 중...');
}

function renderNewsEmpty() {
  renderNewsMessage('표시할 뉴스가 없습니다.');
}

function renderNewsError() {
  renderNewsMessage('뉴스를 불러올 수 없습니다.');
}

function renderNewsTimeout(onRetry) {
  const listEl = document.getElementById('newsList');
  if (!listEl) return;

  listEl.innerHTML = '';

  const msg = document.createElement('p');
  msg.className = 'news-empty';
  msg.textContent = '뉴스를 불러올 수 없습니다.';

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'news-retry-btn';
  retryBtn.textContent = '재시도';
  retryBtn.addEventListener('click', onRetry);

  listEl.appendChild(msg);
  listEl.appendChild(retryBtn);
}

function loadNews(keyword) {
  const newsBtn = document.getElementById('newsBtn');
  if (newsBtn) newsBtn.disabled = true;

  renderNewsLoading();

  fetchRecentNews(keyword)
    .then(data => {
      const items = data && data.items;
      if (!items || !items.length) {
        renderNewsEmpty();
      } else {
        renderNewsList(items);
      }
    })
    .catch(err => {
      if (err && err.name === 'AbortError') {
        renderNewsTimeout(() => loadNews(keyword));
      } else {
        renderNewsError();
      }
    })
    .finally(() => {
      if (newsBtn) newsBtn.disabled = false;
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const newsBtn = document.getElementById('newsBtn');
  if (!newsBtn) return;

  newsBtn.addEventListener('click', () => loadNews(DEFAULT_NEWS_KEYWORD));
});
