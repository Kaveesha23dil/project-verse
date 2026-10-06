import { useState } from 'react';
const types = ['physical', 'digital', 'service', 'dataset', 'license', 'component'];
export default function ProductImage({ src, type, alt = '', title = '', ...props }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const photo = /esp32|transformer|monitoring node|rig/i.test(title || alt) ? 'component' : type === 'dataset' && !/paddy|soil|field soil/i.test(title || alt) ? 'data' : (types.includes(type) ? type : 'physical');
  const fallback = '/images/marketplace/' + photo + '.jpg';
  return <img {...props} src={src && src !== failedSrc ? src : fallback} alt={alt} loading="lazy" decoding="async" onError={() => { if (src) setFailedSrc(src); }} />;
}
