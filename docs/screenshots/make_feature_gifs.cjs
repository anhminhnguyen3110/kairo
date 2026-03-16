// @ts-check
/* eslint-disable @typescript-eslint/no-require-imports */
// Creates one GIF per feature folder from all PNGs inside it.
// GIFs are saved at docs/screenshots/{feature_name}.gif
// Run: node make_feature_gifs.js  (from this directory)

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FFMPEG = path.join('C:\\Users\\admin\\Desktop\\ii\\result\\node_modules\\ffmpeg-static\\ffmpeg.exe');
const BASE = __dirname; // docs/screenshots/
const FRAME_DURATION = 2.5; // seconds per frame

// Map: { folder: relative path, gif: output gif name (no ext) }
const FEATURES = [
  { folder: 'auth',                gif: 'auth'                },
  { folder: 'home',                gif: 'home'                },
  { folder: 'model_selector',      gif: 'model_selector'      },
  { folder: 'chat',                gif: 'chat'                },
  { folder: 'abort_resume',        gif: 'abort_resume'        },
  { folder: 'background_streaming',gif: 'background_streaming'},
  { folder: 'think_tool',          gif: 'think_tool'          },
  { folder: 'web_search',          gif: 'web_search'          },
  { folder: 'artifacts/html',      gif: 'artifacts_html'      },
  { folder: 'artifacts/react',     gif: 'artifacts_react'     },
  { folder: 'artifacts/markdown',  gif: 'artifacts_markdown'  },
  { folder: 'artifacts/mermaid',   gif: 'artifacts_mermaid'   },
  { folder: 'artifacts/svg',       gif: 'artifacts_svg'       },
  { folder: 'artifacts/code',      gif: 'artifacts_code'      },
  { folder: 'artifacts/drawio',    gif: 'artifacts_drawio'    },
  { folder: 'artifacts/file',      gif: 'artifacts_file'      },
  { folder: 'artifact_toolbar',    gif: 'artifact_toolbar'    },
  { folder: 'artifact_versions',   gif: 'artifact_versions'   },
  { folder: 'file_upload',         gif: 'file_upload'         },
  { folder: 'paste_to_file',       gif: 'paste_to_file'       },
  { folder: 'thread_management',   gif: 'thread_management'   },
  { folder: 'inline_title_edit',   gif: 'inline_title_edit'   },
  { folder: 'search',              gif: 'search'              },
  { folder: 'sidebar',             gif: 'sidebar'             },
  { folder: 'mobile',              gif: 'mobile'              },
  { folder: 'user_menu',           gif: 'user_menu'           },
  { folder: 'settings',            gif: 'settings'            },
  { folder: 'copy_button',         gif: 'copy_button'         },
  { folder: 'message_timestamps',  gif: 'message_timestamps'  },
  { folder: 'scroll_fab',          gif: 'scroll_fab'          },
  { folder: 'skills',              gif: 'skills'              },
  { folder: 'latex_math',          gif: 'latex_math'          },
];

function makeGif({ folder, gif }) {
  const folderAbs = path.join(BASE, folder);
  const outputPath = path.join(BASE, gif + '.gif');

  if (!fs.existsSync(folderAbs)) {
    console.log(`  ✗ ${gif} — folder not found: ${folder}`);
    return;
  }

  const frames = fs.readdirSync(folderAbs)
    .filter(f => f.endsWith('.png'))
    .sort();

  if (frames.length === 0) {
    console.log(`  ✗ ${gif} — no PNG frames`);
    return;
  }

  const tmpDir = path.join(BASE, '_tmp_' + gif);
  fs.mkdirSync(tmpDir, { recursive: true });

  frames.forEach((frame, i) => {
    fs.copyFileSync(
      path.join(folderAbs, frame),
      path.join(tmpDir, `frame_${String(i).padStart(3, '0')}.png`)
    );
  });

  const inputPattern = path.join(tmpDir, 'frame_%03d.png');

  try {
    execFileSync(FFMPEG, [
      '-y', '-framerate', `1/${FRAME_DURATION}`,
      '-i', inputPattern,
      '-vf', 'scale=960:-2:flags=lanczos',
      outputPath,
    ], { stdio: 'pipe' });

    const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
    console.log(`  ✓ ${gif}.gif  (${frames.length} frame${frames.length > 1 ? 's' : ''}, ${sizeMB} MB)`);
  } catch (err) {
    console.error(`  ✗ ${gif}: ${String(err.message).slice(0, 120)}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log('Creating feature GIFs from docs/screenshots/**/*.png\n');
for (const feature of FEATURES) {
  makeGif(feature);
}
console.log('\nDone!');
