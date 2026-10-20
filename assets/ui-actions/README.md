# Original Coop Chaos action illustrations

Generated with the built-in OpenAI image generator, 2026-10-20, under the project art owner's direction. These are original interface illustrations, with no third-party content. The approved RGBA sources are retained here; the game loads only the 256px alpha-preserving runtime PNGs from `public/assets/ui/actions/`.

Shared generation brief: one transparent inventory cutout; warm hand-painted stylized 3D woodland object; honey light from upper left; ochre, moss and bark palette; crisp silhouette at 64px; readable on a cream card; no human tools, text or third-party imagery.

| Source | Generation file | Subject |
| --- | --- | --- |
| reeds-source.png | exec-04c13d79-1c32-4929-b1be-2304c6bfc4cd.png | Six cut reeds tied with grass and a russet feather. |
| home-source.png | exec-854eff1d-57e4-43db-9bdc-2a268d6450e9.png | Round open-front woven grass rainhood/platform on an oak fork; three twig ladder rungs, leaves and feather. |
| food-source.png | exec-b275dda8-6751-4818-ab59-45f329460719.png | Folded leaf pouch holding wheat seeds and two amber grubs, with grass tie and feather. |
| nest-source.png | exec-74701a39-b699-4795-a28c-8c988c9d52ea.png | Shallow woven grass/twig cradle with two ivory eggs, oak-leaf rain shelter and feather. |

Two earlier bowl/glow food variants were rejected and are not retained or shipped. These are action illustrations, not recipe geometry or enlarged world markers.

Export with `python3 assets/ui-actions/export.py` using Python with Pillow. The script downsamples with Lanczos and optimizes PNG encoding; it preserves transparency and does not redraw the artwork. All four sources have real alpha ranging from 0 to 255. Runtime appearance must also be checked on the actual cream cards.
