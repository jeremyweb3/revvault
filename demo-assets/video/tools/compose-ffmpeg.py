#!/usr/bin/env python3
"""Fast ffmpeg composite of the demo (same clips, captions, badge, end card and voice as the Remotion
composition). Use when the machine is too loaded for `render.sh`. Output: out/revvault-demo.mp4"""
import json, re, subprocess, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
T = json.loads((root / 'timing.json').read_text()); S = json.loads((root / 'scenes.json').read_text())
paras = T['paragraphs']; total = T['total']; end_start = paras[6]['start']

def ts(t):
    h, r = divmod(t, 3600); m, s = divmod(r, 60); return f'{int(h)}:{int(m):02d}:{s:05.2f}'
events = []
for p in paras[:6]:
    sents = re.findall(r'[^.!?]+[.!?]+', p['text']) or [p['text']]
    sents = [s.strip() for s in sents]; tot = sum(len(s) for s in sents); t = p['start']
    for s in sents:
        d = (p['end'] - p['start']) * len(s) / tot
        events.append((t, t + d, s)); t += d
ass = ['[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1920', 'PlayResY: 1080', 'WrapStyle: 0', '',
       '[V4+ Styles]', 'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
       'Style: Cap,Liberation Sans,40,&H00FFFFFF,&H00FFFFFF,&H2E110603,&H2E110603,0,0,0,0,100,100,0,0,3,16,0,2,260,260,56,1', '',
       '[Events]', 'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text']
for a, b, txt in events:
    ass.append(f'Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{txt}')
(root / 'out').mkdir(exist_ok=True)
(root / 'out' / 'captions.ass').write_text('\n'.join(ass) + '\n')

font = '/usr/share/fonts/liberation/LiberationSans-Regular.ttf'; fontb = '/usr/share/fonts/liberation/LiberationSans-Bold.ttf'
end_d = total - end_start
inputs = []; chains = []
for i, s in enumerate(S):
    inputs += ['-i', str(root / 'clips' / f"{s['id']}.mp4")]
    # hold the last frame (static pages only emit frames on change), then cut to the planned scene length
    chains.append(f"[{i}:v]fps=30,scale=1920:1080,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=30,trim=duration={s['dur']:.3f},setpts=PTS-STARTPTS[v{i}]")
n = len(S)
card = (f"color=c=0x030611:s=1920x1080:r=30:d={end_d:.3f},format=yuv420p,"
        f"drawtext=fontfile={fontb}:text='REVVAULT':fontcolor=0x6f8bff:fontsize=34:x=(w-text_w)/2:y=300,"
        f"drawtext=fontfile={font}:text='Credit that repays itself':fontcolor=white:fontsize=110:x=(w-text_w)/2:y=380,"
        f"drawtext=fontfile={font}:text='Built at the NEAR Hackathon':fontcolor=0xd0d6ea:fontsize=40:x=(w-text_w)/2:y=560,"
        f"drawtext=fontfile={font}:text='Testnet prototype  |  mock USDC  |  seeded revenue history  |  not audited':fontcolor=0x8a93b3:fontsize=28:x=(w-text_w)/2:y=680,"
        f"drawtext=fontfile={font}:text='Repayment is economic, not legal  |  APY is illustrative':fontcolor=0x8a93b3:fontsize=28:x=(w-text_w)/2:y=725[vend]")
chain_in = ''.join(f'[v{i}]' for i in range(n))
filt = ';'.join(chains + [card, f'{chain_in}[vend]concat=n={n+1}:v=1:a=0[vc]',
    f"[vc]subtitles={root/'out'/'captions.ass'}:fontsdir=/usr/share/fonts/liberation,"
    f"drawtext=fontfile={fontb}:text='NEAR testnet  |  mock USDC':fontcolor=0xd8e0ff:fontsize=20:box=1:boxcolor=0x030611@0.8:boxborderw=10:x=w-text_w-24:y=h-text_h-18[vout]"])
cmd = ['ffmpeg', '-y', '-v', 'error', '-stats', *inputs, '-i', str(root / 'audio' / 'voice.mp3'), '-filter_complex', filt,
       '-map', '[vout]', '-map', f'{n}:a', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:v', 'libx264', '-crf', '21', '-preset', 'veryfast',
       '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-t', f'{total:.3f}', '-movflags', '+faststart', str(root / 'out' / 'revvault-demo.mp4')]
print(' '.join(cmd[:6]), '...'); sys.exit(subprocess.call(cmd))
