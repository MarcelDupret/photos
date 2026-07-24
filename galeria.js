const urlParams = new URLSearchParams(window.location.search);
const nomeAlbum = urlParams.get('album') || 'Lua';
const fotoInicial = parseInt(urlParams.get('foto')) || 0;
const paginaVoltar = urlParams.get('pagina') || '1';

document.getElementById('album-title').textContent = nomeAlbum;
document.getElementById('btn-voltar').href = `index.html?pagina=${paginaVoltar}`;

fetch(`albuns/${nomeAlbum}.json`)
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    })
    .then(imagens => {
        inicializarGaleria(imagens, fotoInicial);
    })
    .catch(err => {
        console.error("Erro:", err);
        document.getElementById('gallery-thumbs').innerHTML =
            `<div style="color:#ff6b6b;text-align:center;padding:40px;">
                <p>Erro ao carregar álbum "${nomeAlbum}": ${err.message}</p>
            </div>`;
    });

function inicializarGaleria(imagens, indexInicial) {
    const containerThumbs = document.getElementById('gallery-thumbs');
    const mainImage = document.getElementById('main-image');
    const imageInfo = document.getElementById('image-info');
    const mainWrapper = document.getElementById('main-image-wrapper');

    let currentIndex = indexInicial;
    let isZoomed = false;
    let zoomLevel = 1;
    let panX = 0, panY = 0;
    let isPanning = false;
    let startX = 0, startY = 0;

    imagens.forEach((img, i) => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        slide.innerHTML = `<img src="${img.thumb}" alt="${img.title || ''}" data-index="${i}">`;
        containerThumbs.appendChild(slide);
    });

    const swiper = new Swiper(".mySwiper", {
        spaceBetween: 10,
        slidesPerView: "auto",
        freeMode: true,
        watchSlidesProgress: true,
        centeredSlides: true
    });

    function updateMainImage(index) {
        if (index < 0 || index >= imagens.length) return;

        currentIndex = index;
        const img = imagens[index];

        mainImage.classList.add('loading');
        mainImage.src = img.src;
        imageInfo.textContent = img.title || '';

        // Reset zoom/pan
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        isZoomed = false;
        mainImage.style.transform = 'translate(0, 0) scale(1)';
        mainImage.classList.remove('zoomable');

        mainImage.onload = () => mainImage.classList.remove('loading');
        mainImage.onerror = () => mainImage.classList.remove('loading');

        swiper.slideTo(index);
        updateActiveThumb(index);
    }

    function updateActiveThumb(index) {
        document.querySelectorAll('.swiper-slide').forEach((slide, i) => {
            slide.classList.toggle('swiper-slide-thumb-active', i === index);
        });
    }

    function navigate(delta) {
        const newIndex = (currentIndex + delta + imagens.length) % imagens.length;
        updateMainImage(newIndex);
    }

    // Click thumbnail
    containerThumbs.addEventListener('click', (e) => {
        const slide = e.target.closest('.swiper-slide');
        if (!slide) return;
        const idx = parseInt(slide.querySelector('img').getAttribute('data-index'));
        updateMainImage(idx);
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.key === 'ArrowLeft') navigate(-1);
        else if (e.key === 'ArrowRight') navigate(1);
    });

    // Wheel zoom
    mainWrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
            // Zoom with Ctrl+wheel
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            zoomLevel = Math.max(0.5, Math.min(5, zoomLevel + delta));
            applyTransform();
            isZoomed = zoomLevel > 1;
            mainImage.classList.toggle('zoomable', isZoomed);
        } else if (isZoomed) {
            // Pan with wheel when zoomed
            panX -= e.deltaX;
            panY -= e.deltaY;
            applyTransform();
        }
    }, { passive: false });

    // Drag to pan when zoomed
    mainImage.addEventListener('mousedown', (e) => {
        if (!isZoomed) return;
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        mainImage.style.cursor = 'grabbing';
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        applyTransform();
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
        mainImage.style.cursor = isZoomed ? 'grab' : 'zoom-in';
    });

    // Double-click to zoom in/out
    mainImage.addEventListener('dblclick', () => {
        if (isZoomed) {
            zoomLevel = 1;
            panX = 0;
            panY = 0;
            isZoomed = false;
            mainImage.classList.remove('zoomable');
        } else {
            zoomLevel = 2;
            isZoomed = true;
            mainImage.classList.add('zoomable');
        }
        applyTransform();
    });

    function applyTransform() {
        mainImage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    }

    // Touch support for mobile
    let touchStartDist = 0;
    let touchStartZoom = 1;
    let lastTouchCenter = { x: 0, y: 0 };

    mainWrapper.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            // Pinch to zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartDist = Math.hypot(dx, dy);
            touchStartZoom = zoomLevel;
            lastTouchCenter = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2
            };
        } else if (isZoomed && e.touches.length === 1) {
            // Pan with one finger when zoomed
            isPanning = true;
            startX = e.touches[0].clientX - panX;
            startY = e.touches[0].clientY - panY;
        }
    }, { passive: false });

    mainWrapper.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            zoomLevel = Math.max(0.5, Math.min(5, touchStartZoom * (dist / touchStartDist)));
            isZoomed = zoomLevel > 1;
            mainImage.classList.toggle('zoomable', isZoomed);
            applyTransform();
            e.preventDefault();
        } else if (isPanning && e.touches.length === 1) {
            panX = e.touches[0].clientX - startX;
            panY = e.touches[0].clientY - startY;
            applyTransform();
            e.preventDefault();
        }
    }, { passive: false });

    mainWrapper.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            isPanning = false;
        }
    });

    // Initialize
    updateMainImage(indexInicial);
}
