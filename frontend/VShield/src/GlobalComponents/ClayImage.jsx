import { claySource } from './clayImages';

// A clay picture by name (see clayImages.js and assets/clay/README.md).
// Renders nothing when the name has no picture yet, so a page can name an
// image before it has been made. `sizes` tells the browser how wide it is
// shown, for badges that come at several widths.
const ClayImage = ({ name, alt = '', width = 256, sizes, className = '', style, ...rest }) => {
  const source = claySource(name, width);
  if (!source) return null;
  return (
    <img
      src={source.src}
      srcSet={source.srcSet}
      sizes={source.srcSet ? sizes || `${width}px` : undefined}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={className}
      style={style}
      {...rest}
    />
  );
};

export default ClayImage;
