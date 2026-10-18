"""Generate windows/skylight.ico (night-sky disc, a plane and its trail).
Standard library only. Run: python3 windows/tools/make-icon.py"""
import math, struct, zlib, os

def render(size):
    ss = 4  # supersampling
    px = []
    stars = [(0.30, 0.28, 0.018), (0.70, 0.22, 0.014), (0.22, 0.62, 0.012),
             (0.78, 0.70, 0.016), (0.55, 0.15, 0.010), (0.40, 0.82, 0.011)]
    def plane(x, y):
        # plane heading up-right at 45 deg, centred at (0.60, 0.40)
        cx, cy = 0.60, 0.40
        a = math.radians(45)
        u = (x - cx) * math.cos(a) - (y - cy) * math.sin(a)   # along track
        v = (x - cx) * math.sin(a) + (y - cy) * math.cos(a)   # across
        u, v = -v, u
        fus = abs(v) < 0.028 and -0.16 < u < 0.15
        wing = abs(u - 0.0 + abs(v) * 0.45) < 0.035 and abs(v) < 0.15
        tail = abs(u + 0.13 + abs(v) * 0.4) < 0.025 and abs(v) < 0.065
        return fus or wing or tail
    for j in range(size):
        row = []
        for i in range(size):
            acc = [0.0, 0.0, 0.0, 0.0]
            for sj in range(ss):
                for si in range(ss):
                    x = (i + (si + 0.5) / ss) / size
                    y = (j + (sj + 0.5) / ss) / size
                    r = math.hypot(x - 0.5, y - 0.5)
                    if r > 0.48:
                        continue
                    col = (11, 16, 38)
                    for sx, sy, sr in stars:
                        if math.hypot(x - sx, y - sy) < sr:
                            col = (200, 210, 255)
                    # trail from lower-left towards the plane
                    t = (x - 0.18 + y - 0.82) / 2 + 0.5
                    d = abs((x - 0.18) + (y - 0.82)) / math.sqrt(2)
                    if 0.0 < t < 0.85 and d < 0.012 + 0.0 * t and x < 0.55:
                        k = max(0.0, min(1.0, (x - 0.18) / 0.37))
                        col = (int(11 + 244 * k * 0.8), int(16 + 160 * k * 0.8), int(38 + 20 * k))
                    if plane(x, y):
                        col = (255, 196, 64)
                    acc[0] += col[0]; acc[1] += col[1]; acc[2] += col[2]; acc[3] += 255
            n = ss * ss
            a = acc[3] / n
            if a == 0:
                row += [0, 0, 0, 0]
            else:
                w = acc[3] / 255
                row += [int(acc[0] / w), int(acc[1] / w), int(acc[2] / w), int(a)]
        px.append(bytes(row))
    raw = b"".join(b"\x00" + r for r in px)
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

sizes = [16, 32, 48, 256]
pngs = [render(s) for s in sizes]
out = struct.pack("<HHH", 0, 1, len(sizes))
offset = 6 + 16 * len(sizes)
for s, p in zip(sizes, pngs):
    out += struct.pack("<BBBBHHII", s % 256, s % 256, 0, 0, 1, 32, len(p), offset)
    offset += len(p)
out += b"".join(pngs)
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "skylight.ico")
open(dst, "wb").write(out)
print("wrote", os.path.normpath(dst))
