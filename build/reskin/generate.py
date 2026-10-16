#!/usr/bin/env python3
"""Generate cardinal-web's flat component graphics (original work, CC0).

Every file keeps the exact width/height/viewBox of the graphic it replaces so
module layouts and hit areas in Cardinal are unchanged. Output goes to
build/reskin/out/{Rack,Fundamental}/ and build/build-mini-wasm.sh copies it
over the fork's resources before `make mini`.
"""
import os, sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
RACK = os.path.join(OUT, 'Rack'); FUND = os.path.join(OUT, 'Fundamental')
os.makedirs(RACK, exist_ok=True); os.makedirs(FUND, exist_ok=True)

DISC, RING, HOLE, POINTER, INNER = '#262626', '#8f8f8f', '#060606', '#f4f4f4', '#3a3a3a'
COLORS = {'White': '#d9d9d9', 'Green': '#3fb8a8', 'Red': '#ff8c42', 'Blue': '#5b8def', 'Gray': '#9a9a9a'}

def svg(w, h, body, vb=None):
    vb = vb or f'0 0 {w} {h}'
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<!-- cardinal-web flat component, original work, CC0-1.0 -->\n'
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}px" height="{h}px" viewBox="{vb}">\n{body}\n</svg>\n')

def write(d, name, text):
    with open(os.path.join(d, name), 'w') as f: f.write(text)

def disc(S, ring=RING):
    c = S / 2; sw = max(1.0, S * 0.045); r = c - sw / 2 - 0.3
    return f'  <circle cx="{c:.3f}" cy="{c:.3f}" r="{r:.3f}" fill="{DISC}" stroke="{ring}" stroke-width="{sw:.3f}"/>'

def pointer(S):
    c = S / 2; w = max(1.6, S * 0.11); top = S * 0.10; hgt = S * 0.36
    return f'  <rect x="{c - w/2:.3f}" y="{top:.3f}" width="{w:.3f}" height="{hgt:.3f}" rx="{w/2:.3f}" fill="{POINTER}"/>'

def ring_fg(S, color):
    c = S / 2; sw = max(1.2, S * 0.05); r = c - sw / 2 - 0.3
    return f'  <circle cx="{c:.3f}" cy="{c:.3f}" r="{r:.3f}" fill="none" stroke="{color}" stroke-width="{sw:.3f}"/>'

def empty(S):
    return f'  <rect x="0" y="0" width="{S}" height="{S}" fill="none"/>'

def port_round(S, pitch=False):
    c = S / 2; sw = 1.5; r = c - sw / 2 - 0.4
    b = [f'  <circle cx="{c:.3f}" cy="{c:.3f}" r="{r:.3f}" fill="#1a1a1a" stroke="#a6a6a6" stroke-width="{sw}"/>']
    if pitch:
        b.append(f'  <circle cx="{c:.3f}" cy="{c:.3f}" r="{r - 3.2:.3f}" fill="none" stroke="#a6a6a6" stroke-width="1"/>')
    b.append(f'  <circle cx="{c:.3f}" cy="{c:.3f}" r="{S*0.30:.3f}" fill="none" stroke="{INNER}" stroke-width="1"/>')
    b.append(f'  <circle cx="{c:.3f}" cy="{c:.3f}" r="{S*0.21:.3f}" fill="{HOLE}"/>')
    return '\n'.join(b)

def port_gate(S):
    c = S / 2; sw = 1.5; m = sw / 2 + 0.4; side = S - 2 * m
    return '\n'.join([
        f'  <rect x="{m:.3f}" y="{m:.3f}" width="{side:.3f}" height="{side:.3f}" rx="{S*0.16:.3f}" fill="#1a1a1a" stroke="#a6a6a6" stroke-width="{sw}"/>',
        f'  <circle cx="{c:.3f}" cy="{c:.3f}" r="{S*0.30:.3f}" fill="none" stroke="{INNER}" stroke-width="1"/>',
        f'  <circle cx="{c:.3f}" cy="{c:.3f}" r="{S*0.21:.3f}" fill="{HOLE}"/>'])

def port_clock(S):
    c = S / 2; m = 1.0
    pts = f'{c:.3f},{m:.3f} {S-m:.3f},{c:.3f} {c:.3f},{S-m:.3f} {m:.3f},{c:.3f}'
    return '\n'.join([
        f'  <polygon points="{pts}" fill="#1a1a1a" stroke="#a6a6a6" stroke-width="1.5" stroke-linejoin="round"/>',
        f'  <circle cx="{c:.3f}" cy="{c:.3f}" r="{S*0.28:.3f}" fill="none" stroke="{INNER}" stroke-width="1"/>',
        f'  <circle cx="{c:.3f}" cy="{c:.3f}" r="{S*0.20:.3f}" fill="{HOLE}"/>'])

def button(S, on):
    c = S / 2; r = c - 1.2
    fill = '#e6e6e6' if on else '#333333'
    return f'  <circle cx="{c:.3f}" cy="{c:.3f}" r="{r:.3f}" fill="{fill}" stroke="#8f8f8f" stroke-width="1.2"/>'

# ---- Rack component library (used by Audible Instruments and Cardinal's own modules)
for name, S in [('RoundSmallBlackKnob', 22.67578), ('RoundBlackKnob', 28.34759), ('RoundLargeBlackKnob', 35.99997),
                ('RoundBigBlackKnob', 45), ('RoundHugeBlackKnob', 53.85929), ('Trimpot', 17.85552)]:
    write(RACK, f'{name}_bg.svg', svg(S, S, disc(S)))
    write(RACK, f'{name}.svg', svg(S, S, pointer(S)))
for fam, S, colors in [('Rogan1PS', 39.6836, ['White', 'Green', 'Red', 'Blue']),
                       ('Rogan2PS', 43.34375, ['White', 'Green', 'Red', 'Blue']),
                       ('Rogan3PS', 51.84375, ['White', 'Green', 'Red', 'Blue']),
                       ('Rogan6PS', 89.11328, ['White']),
                       ('Rogan2S', 43.34375, ['Gray'])]:
    write(RACK, f'{fam}_bg.svg', svg(S, S, disc(S)))
    for col in colors:
        write(RACK, f'{fam}{col}.svg', svg(S, S, pointer(S)))
        write(RACK, f'{fam}{col}_fg.svg', svg(S, S, ring_fg(S, COLORS[col])))
P = 23.7
write(RACK, 'PJ301M.svg', svg(P, P, port_round(P)))
write(RACK, 'PJ301M-dark.svg', svg(P, P, port_round(P)))
write(RACK, 'PortGate.svg', svg(P, P, port_gate(P)))
write(RACK, 'PortClock.svg', svg(P, P, port_clock(P)))
write(RACK, 'PortPitch.svg', svg(P, P, port_round(P, pitch=True)))

# ---- Fundamental (GPL, DISTRHO's fork): knob = static disc, marker = rotating pointer
write(FUND, 'knob.svg', svg(68.0, 68.0, disc(68.0)))
write(FUND, 'knob-marker.svg', svg(68.0, 68.0, pointer(68.0)))
write(FUND, 'knob-small.svg', svg(18, 18, disc(18)))
write(FUND, 'knob-marker-small.svg', svg(18, 18, pointer(18)))
write(FUND, 'port.svg', svg(22, 22, port_round(22)))
write(FUND, 'button-off.svg', svg(21, 21, button(21, False)))
write(FUND, 'button-on.svg', svg(21, 21, button(21, True)))
print('wrote', len(os.listdir(RACK)), 'Rack and', len(os.listdir(FUND)), 'Fundamental files to', OUT)
