import './style.css';
// ?gallery=1 → 元素圖庫（島以外陳列所有元素）；否則進島
if (new URLSearchParams(location.search).has('gallery')) {
  document.getElementById('ui')!.style.display = 'none';
  document.getElementById('brand')!.querySelector('p')!.textContent = '元素圖庫';
  import('./gallery').then((m) => m.runGallery(document.getElementById('app')!));
} else {
  import('./main');
}
