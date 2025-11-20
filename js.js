const DEFAULT_REGION_KEY = 'DEFAULT';
const NEWS_DATA_PATH = 'news.json';
const CONTENT_DATA_PATH = 'content.json'; 
const regionTitle = document.getElementById('region-title');
const newsContainer = document.getElementById('news-container');
const refreshBtn = document.getElementById('refresh-location-btn');
const urlParams = new URLSearchParams(window.location.search);

function createNewsCard(newsItem) {
    const detailUrl = `detail.html?id=${newsItem.link}`;
    
    return `
        <div class="news-card">
            <img src="${newsItem.image}" alt="${newsItem.title}">
            <div class="card-content">
                <h3>${newsItem.title}</h3>
                <p>${newsItem.description}</p>
                <a href="${detailUrl}" class="read-more">Читать подробнее</a>
            </div>
        </div>
    `;
}

function renderNews(newsArray, regionName) {
    regionTitle.innerHTML = `📰 Новости для <span>${regionName}</span>`;
    
    if (newsArray.length === 0) {
        newsContainer.innerHTML = '<p>К сожалению, локальных новостей для вашего региона пока нет.</p>';
        return;
    }

    const newsHtml = newsArray.map(createNewsCard).join('');
    newsContainer.innerHTML = newsHtml;
}

async function fetchNewsData() {
    try {
        const response = await fetch(NEWS_DATA_PATH);
        if (!response.ok) {
            throw new Error(`Ошибка загрузки JSON: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Ошибка при загрузке новостей:", error);
        return {}; 
    }
}

async function fetchContentData() {
    try {
        const response = await fetch(CONTENT_DATA_PATH);
        if (!response.ok) {
            throw new Error(`Ошибка загрузки CONTENT JSON: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Ошибка при загрузке подробного контента:", error);
        return {}; 
    }
}

function getCountryCodeFromCoords(lat) {
    if (lat > 40 && lat < 50) { 
        return { code: 'KZ', name: 'Казахстан' };
    }
    
    return { code: DEFAULT_REGION_KEY, name: 'Мир' };
}

async function loadGeoNews() {
    if (!newsContainer) return;

    newsContainer.innerHTML = '';
    regionTitle.textContent = '📍 Определение местоположения...';
    
    const allNews = await fetchNewsData();

    const loadDefault = (reason = 'Ошибка геолокации') => {
        console.warn(`Загрузка новостей по умолчанию: ${reason}`);
        const defaultNews = allNews[DEFAULT_REGION_KEY] || [];
        renderNews(defaultNews, 'Мира');
    };

    if (!navigator.geolocation) {
        return loadDefault('Геолокация не поддерживается браузером.');
    }

    const getPosition = () => new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 8000, 
            enableHighAccuracy: true 
        });
    });

    try {
        const position = await getPosition();
        const { latitude } = position.coords;
        
        const region = getCountryCodeFromCoords(latitude);
        const regionCode = region.code;
        const regionName = region.name;
        
        const localNews = allNews[regionCode] || [];
        
        renderNews(localNews, regionName);

    } catch (error) {
        let errorMessage;
        if (error.code === error.PERMISSION_DENIED) {
            errorMessage = "Доступ к геолокации запрещен пользователем. Пожалуйста, разрешите доступ.";
        } else if (error.code === error.TIMEOUT) {
            errorMessage = "Истекло время ожидания геолокации. Попробуйте обновить.";
        } else {
            errorMessage = "Неизвестная ошибка геолокации.";
        }
        loadDefault(errorMessage);
    }
}

async function loadNewsDetail() {
    const newsId = urlParams.get('id');
    const detailContainer = document.getElementById('news-detail-content');
    const titleElement = document.getElementById('detail-title');

    if (!detailContainer) return;

    if (!newsId) {
        detailContainer.innerHTML = '<p>Ошибка: ID новости не найден.</p><a href="index.html" class="back-link">← На главную</a>';
        return;
    }

    const allNews = await fetchNewsData();
    const contentData = await fetchContentData();

    const regionCode = newsId.split('-')[0];
    const newsArray = allNews[regionCode] || [];

    const newsItem = newsArray.find(item => item.link === newsId);
    const detailSections = contentData[newsId];

    if (newsItem && detailSections) {
        titleElement.textContent = newsItem.title;
        
        let contentHtml = `
            <div class="detail-header">
                <h1>${newsItem.title}</h1>
                <p>— ${newsItem.description}</p>
            </div>
            <img src="${newsItem.image}" alt="${newsItem.title}" class="detail-image">
            <div class="detail-content">
        `;

        detailSections.forEach(section => {
            if (section.type === 'text') {
                contentHtml += `<p>${section.value}</p>`;
            } else if (section.type === 'image') {
                contentHtml += `
                    <figure>
                        <img src="${section.src}" alt="${section.caption}" class="detail-image detail-sub-image">
                        <figcaption>${section.caption}</figcaption>
                    </figure>
                `;
            }
        });

        contentHtml += `
            </div>
            <a href="index.html" class="back-link">← Вернуться к новостям</a>
        `;
        
        detailContainer.innerHTML = contentHtml;
        
    } else {
        detailContainer.innerHTML = `<p>Новость с ID: ${newsId} или ее подробности не найдены.</p><a href="index.html" class="back-link">← На главную</a>`;
    }
}

if (document.getElementById('news-detail-content')) {
    loadNewsDetail();
} else if (document.getElementById('news-container')) {
    document.addEventListener('DOMContentLoaded', loadGeoNews);
    refreshBtn.addEventListener('click', loadGeoNews);
}