"""Extract the original logo with a fitted paper matte; never redraw its artwork.
Requires Pillow, numpy and scipy. Original RGB pixels are kept in opaque regions.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

root = Path(__file__).resolve().parents[2]
source = root / 'client/public/assets/brand-logo.png'
out = root / 'client/public/assets/brand-logo-transparent.png'
im = np.asarray(Image.open(source).convert('RGB'), dtype=float)
h, w = im.shape[:2]
y, x = np.mgrid[-1:1:complex(h), -1:1:complex(w)]
terms = np.stack([x**i * y**j for i in range(4) for j in range(4-i)], axis=-1)
# Robust smooth paper estimate; exclude all green and gold artwork from fitting.
valid = (im[...,0] > 249) & (im[...,1] > 247) & (im[...,2] > 239)
for _ in range(5):
    coeff = np.linalg.lstsq(terms[valid][::7], im[valid][::7], rcond=None)[0]
    paper = np.clip(terms @ coeff, 0, 255)
    residual = np.max(paper - im, axis=-1)
    valid &= (residual < 3.2) & (residual > -4)
mask = residual > 4
labels, count = ndi.label(mask)
# Discard isolated paper grain, retaining even tiny letter dots and side rules.
strong = np.unique(labels[residual > 18])
mask = np.isin(labels, strong[strong != 0])
# Close one-pixel pinholes inside artwork, without closing counterspaces.
mask = ndi.binary_fill_holes(mask) & (residual > 2.5) | mask
inside = ndi.binary_erosion(mask, iterations=2)
# Very thin lettering/rules must also serve as a foreground reference.
inside |= mask & (residual > 30) & (ndi.maximum_filter(residual, size=3) == residual)
_, indexes = ndi.distance_transform_edt(~inside, return_indices=True)
foreground = im[indexes[0], indexes[1]]
vector = paper - foreground
alpha = np.clip(np.sum((paper-im)*vector, axis=-1) / np.maximum(np.sum(vector*vector, axis=-1), 1), 0, 1)
near = ndi.binary_dilation(mask, iterations=1)
alpha[~near] = 0
alpha[inside] = 1
alpha[alpha < .035] = 0
# Unmix only the antialiased edge pixels to avoid an ivory halo on dark surfaces.
rgb = im.copy()
edge = (alpha > 0) & (alpha < 1)
rgb[edge] = np.clip((im[edge] - (1-alpha[edge,None])*paper[edge]) / alpha[edge,None], 0, 255)
rgba = np.dstack([rgb, alpha*255]).round().astype('uint8')
Image.fromarray(rgba, 'RGBA').save(out, optimize=True)
# QA contact sheet: inspect both light and dark environments.
cut = Image.open(out)
canvases=[]
for color in ['#fbf6e8','#123f36']:
    bg=Image.new('RGBA', cut.size, color); bg.alpha_composite(cut); canvases.append(bg.convert('RGB'))
qa=Image.new('RGB',(w*2,h))
for i,canvas in enumerate(canvases):qa.paste(canvas,(i*w,0))
qa.save(root/'docs/screenshots/logo-transparency-qa.jpg', quality=92)
print({'size':[w,h], 'transparent_pixels':int((rgba[...,3]==0).sum()), 'opaque_pixels':int((rgba[...,3]==255).sum()), 'opaque_rgb_unchanged':bool(np.array_equal(rgba[rgba[...,3]==255,:3], im[rgba[...,3]==255].astype('uint8')))})
