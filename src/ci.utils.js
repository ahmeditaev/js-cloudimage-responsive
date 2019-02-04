const getPresets = (value = '', type) => {
  const splittedValues = value.split('|');
  const result = { presets: {}, order: [] };

  for (let i = 0; i < splittedValues.length; i++) {
    const splittedParam = splittedValues[i] && splittedValues[i].split(':');
    const prop = splittedParam[0] && splittedParam[0].trim();
    const val = splittedParam[1] && splittedParam[1].trim();

    if (prop && val) {
      result.presets[prop] = val;
      result.order.unshift(prop);
    }
  }

  return result[type];
}

const checkOnMedia = size => {
  try {
    const object = eval('(' + size + ')');

    return object && typeof object === "object";
  }
  catch (e) {
    return false;
  }
};

const checkIfRelativeUrlPath = src => {
  if (src.indexOf('//') === 0) {
    src = window.location.protocol + src;
  }
  return (src.indexOf('http://') !== 0 && src.indexOf('https://') !== 0 && src.indexOf('//') !== 0);
}

const getImgSrc = (src, isRelativeUrlPath = false, baseUrl = '') => {
  if (isRelativeUrlPath)
    return baseUrl + src;

  return src;
}

const getSizeAccordingToPixelRatio = size => {
  const splittedSizes = size.toString().split('x');
  const result = [];

  [].forEach.call(splittedSizes, size => {
    result.push(size * Math.round(window.devicePixelRatio || 1));
  });

  return result.join('x');
}

const generateUrl = (operation, size, filters, imgSrc, config) => {
  const { ultraFast, token, container, queryString } = config;
  const isUltraFast = ultraFast ? 'https://scaleflex.ultrafast.io/' : 'https://';
  const cloudUrl = isUltraFast + token + '.' + container + '/';

  return cloudUrl + operation + '/' + size + '/' + filters + '/' + imgSrc + queryString;
}

const getParentWidth = (img, config) => {
  if (!(img && img.parentElement && img.parentElement.getBoundingClientRect) && !(img && img.width))
    return config.width;

  const parentContainer = getParentContainerWithWidth(img);
  const currentWidth = parseInt(parentContainer, 10);
  const computedWidth = parseInt(window.getComputedStyle(img).width);

  if ((computedWidth && (computedWidth < currentWidth && computedWidth > 15) || !currentWidth)) {
    return getSizeLimit(computedWidth);
  } else {
    if (!currentWidth) return img.width || config.width;

    return getSizeLimit(currentWidth);
  }
}

const getParentContainerWithWidth = img => {
  let parentNode = null;
  let width = 0;

  do {
    parentNode = (parentNode && parentNode.parentNode) || img.parentNode;
    width = parentNode.getBoundingClientRect().width;
  } while (parentNode && !width)

  return width;
}

const generateSources = (operation, size, filters, imgSrc, isAdaptive, config, isPreview) => {
  const sources = [];

  if (isAdaptive) {
    const orderFiltered = [];

    for (let i = 0; i < config.order.length; i++) {
      const nextSize = size[config.order[i]];

      if (nextSize)
        orderFiltered.unshift(config.order[i]);
    }

    for (let i = 0; i < orderFiltered.length; i++) {
      const isLast = !(i < orderFiltered.length - 1);
      const nextSizeType = isLast ? orderFiltered[i - 1] : orderFiltered[i];
      let nextSize = size[orderFiltered[i]];

      if (isPreview) {
        nextSize = nextSize.split('x').map(size => size / 5).join('x');
        filters = 'q10.foil1';
      }

      const srcSet = generateSrcset(operation, nextSize, filters, imgSrc, config);
      const mediaQuery = '(' + (isLast ? 'min' : 'max') + '-width: ' + (config.presets[nextSizeType] + (isLast ? 1 : 0)) + 'px)';

      sources.push({ mediaQuery, srcSet });
    }
  } else {
    if (isPreview) {
      size = size.split('x').map(size => size / 5).join('x');
      filters = 'q10.foil1';
    }

    sources.push({
      srcSet: generateSrcset(operation, size, filters, imgSrc, config)
    });
  }

  return sources;
}

const generateSrcset = (operation, size, filters, imgSrc, config) => {
  const imgWidth = size.toString().split('x')[0]
  const imgHeight = size.toString().split('x')[1];

  return generateImgSrc(operation, filters, imgSrc, imgWidth, imgHeight, 1, config);
}

const getRatioBySize = (size, config) => {
  let width, height;

  if (typeof size === 'object') {
    const breakPoint = getBreakPoint(config);
    let orderIndex = config.order.indexOf(breakPoint);
    let breakPointSize = null;

    do {
      const nextBreakpoint = config.order[orderIndex]
      breakPointSize = size[nextBreakpoint];
      orderIndex--;
    } while (!breakPointSize && orderIndex >= 0)

    if (!breakPointSize) {
      let orderIndex = config.order.indexOf(breakPoint);

      do {
        const nextBreakpoint = config.order[orderIndex]
        breakPointSize = size[nextBreakpoint];
        orderIndex++;
      } while (!breakPointSize && orderIndex <= config.order.length)
    }

    width = breakPointSize.toString().split('x')[0]
    height = breakPointSize.toString().split('x')[1];
  } else {
    width = size.toString().split('x')[0]
    height = size.toString().split('x')[1];
  }

  if (width && height)
    return width / height;

  return null;
}

const getBreakPoint = (config) => {
  const { presets, order } = config;
  const innerWidth = window.innerWidth;
  const prevBreakPointLimit = order.findIndex(item => presets[item] < innerWidth);

  return order[prevBreakPointLimit - 1] || order[prevBreakPointLimit] || order[order.length - 1];
}

const generateImgSrc = (operation, filters, imgSrc, imgWidth, imgHeight, factor, config) => {
  let imgSize = Math.trunc(imgWidth * factor);

  if (imgHeight)
    imgSize += 'x' + Math.trunc(imgHeight * factor);

  return generateUrl(operation, getSizeAccordingToPixelRatio(imgSize), filters, imgSrc, config)
    .replace('http://scaleflex.ultrafast.io/', '')
    .replace('https://scaleflex.ultrafast.io/', '')
    .replace('//scaleflex.ultrafast.io/', '')
    .replace('///', '/');
}

const getSizeLimit = (currentSize) => {
  return currentSize <= 25 ? '25' :
    currentSize <= 50 ? '50' :
      currentSize <= 100 ? '100'
        : currentSize <= 200 ? '200'
        : currentSize <= 300 ? '300'
          : currentSize <= 400 ? '400'
            : currentSize <= 500 ? '500'
              : currentSize <= 600 ? '600'
                : currentSize <= 700 ? '700'
                  : currentSize <= 800 ? '800'
                    : currentSize <= 900 ? '900'
                      : currentSize <= 1000 ? '1000'
                        : currentSize <= 1100 ? '1100'
                          : currentSize <= 1200 ? '1200'
                            : currentSize <= 1300 ? '1300'
                              : currentSize <= 1400 ? '1400'
                                : currentSize <= 1500 ? '1500'
                                  : currentSize <= 1600 ? '1600'
                                    : currentSize <= 1700 ? '1700'
                                      : currentSize <= 1800 ? '1800'
                                        : currentSize <= 1900 ? '1900'
                                          : currentSize <= 2400 ? '2400'
                                            : currentSize <= 2800 ? '2800'
                                              : '3600';
}

const filterImages = (images, type) => {
  const filtered = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const size = image.getAttribute(type) || '';
    const isProcessed = image.getAttribute('data-is-ci-processed') === 'true';

    if (size.slice(-4).toLowerCase() !== '.svg' && !isProcessed) {
      filtered.push(image);
    }
  }

  return filtered;
}

const getImageProps = (image) => ({
  operation: attr(image, 'o') || attr(image, 'operation') || attr(image, 'data-operation') || undefined,
  size: attr(image, 's') || attr(image, 'size') || attr(image, 'data-size') || undefined,
  filters: attr(image, 'f') || attr(image, 'filters') || attr(image, 'data-filters') || undefined,
  ratio: attr(image, 'r') || attr(image, 'ratio') || attr(image, 'data-ratio') || undefined,
  src: attr(image, 'ci-src') || attr(image, 'data-src') || undefined,
});

const attr = (element, attribute) => element.getAttribute(attribute);

export const isResponsiveAndLoaded = image => (
  !(attr(image, 's') || attr(image, 'size') || attr(image, 'data-size')) && image.className.includes('ci-image-loaded')
);

//const insertSource = (element, value) => {
//  let template = document.createElement('template');
//
//  if ('content' in template) {
//    template.innerHTML = value;
//    element.parentNode.insertBefore(template.content.firstChild, element);
//  } else {
//    template = document.createElement('div');
//    template.innerHTML = value;
//    element.parentNode.insertBefore(template.firstChild, element);
//  }
//};

const insertSource = (element, source) => {
  //let template = document.createElement('template');

  element.parentNode.insertBefore(source, element);
};

const addClass = (elem, className) => {
  if (!elem.classList.contains(className)) {
    elem.classList.add(className);
  }
}

const removeClass = (elem, className) => {
  if (elem.classList.contains(className)) {
    elem.classList.remove(className);
  }
}

export {
  getPresets,
  checkOnMedia,
  checkIfRelativeUrlPath,
  getImgSrc,
  getSizeAccordingToPixelRatio,
  generateUrl,
  getParentWidth,
  generateSources,
  getRatioBySize,
  getBreakPoint,
  filterImages,
  getImageProps,
  insertSource,
  addClass,
  removeClass
}