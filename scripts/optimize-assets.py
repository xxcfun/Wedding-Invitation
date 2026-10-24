"""Rebuild font chunks, mobile cover and audio. Requires Pillow, fonttools, brotli, imageio-ffmpeg."""
from pathlib import Path
import re, subprocess
from PIL import Image
from fontTools import subset
from fontTools.ttLib import TTFont
root = Path(__file__).resolve().parent.parent
assets = root / 'assets'
font = TTFont(assets / 'island-round.ttf')
all_chars = set(font.getBestCmap())
text = '\n'.join((root / f).read_text() for f in ['index.html', 'main.js', 'styles.css'])
common = all_chars & set(map(ord, text))
groups = [sorted(common)]
remaining = sorted(all_chars - common)
groups += [remaining[i:i+256] for i in range(0, len(remaining), 256)]
rules = []
for i, chars in enumerate(groups):
    options = subset.Options()
    options.flavor = 'woff2'
    f = TTFont(assets / 'island-round.ttf')
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=chars)
    sub.subset(f)
    f.flavor = 'woff2'
    name = f'island-round-{i}.woff2'
    f.save(assets / name)
    ranges = ','.join(f'U+{c:X}' for c in chars)
    rules.append('@font-face {\n  font-family: "IslandRound";\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url("assets/'+name+'") format("woff2");\n  unicode-range: '+ranges+';\n}')
css = root / 'styles.css'
s = css.read_text()
start = s.index('/* FONT CHUNKS START */') if '/* FONT CHUNKS START */' in s else s.index('/* 使用同款完整字库')
end = s.index('/* FONT CHUNKS END */', start) + len('/* FONT CHUNKS END */') if '/* FONT CHUNKS END */' in s else s.index('/* 主题令牌', start)
s = s[:start] + '/* FONT CHUNKS START */\n' + '\n'.join(rules) + '\n/* FONT CHUNKS END */\n\n' + s[end:]
css.write_text(s)
Image.open(assets / 'island-cover-hd.png').convert('RGB').resize((960,960), Image.Resampling.LANCZOS).save(assets / 'island-cover-mobile.webp', quality=85, method=6)
import imageio_ffmpeg
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-i', str(assets / 'island-bgm.mp3'), '-codec:a', 'libmp3lame', '-b:a', '96k', str(assets / 'island-bgm-lite.mp3')], check=True, capture_output=True)
print('Font common chunk:', (assets / 'island-round-0.woff2').stat().st_size)
print('Font coverage:', len(all_chars), 'characters in', len(groups), 'chunks')
for name in ['island-cover-mobile.webp','island-bgm-lite.mp3']:
    print(name, (assets / name).stat().st_size)
