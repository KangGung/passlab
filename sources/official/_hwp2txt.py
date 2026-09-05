import sys, zlib, struct, olefile
def extract(path):
    ole = olefile.OleFileIO(path)
    hdr = ole.openstream('FileHeader').read()
    flags = struct.unpack('<I', hdr[36:40])[0]
    compressed = flags & 1
    out = []
    secs = sorted([e for e in ole.listdir() if e[0]=='BodyText'], key=lambda e:int(e[1].replace('Section','')))
    for e in secs:
        data = ole.openstream('/'.join(e)).read()
        if compressed:
            data = zlib.decompress(data, -15)
        i = 0
        while i + 4 <= len(data):
            h = struct.unpack('<I', data[i:i+4])[0]; i += 4
            tag = h & 0x3FF; size = (h >> 20) & 0xFFF
            if size == 0xFFF:
                size = struct.unpack('<I', data[i:i+4])[0]; i += 4
            body = data[i:i+size]; i += size
            if tag == 67:  # PARA_TEXT
                txt = []; j = 0
                n = len(body)//2
                while j < n:
                    c = struct.unpack('<H', body[2*j:2*j+2])[0]
                    if c < 32:
                        if c in (10, 13): txt.append('\n'); j += 1
                        elif c in (0, 24, 25, 26, 27, 28, 29, 30, 31): j += 1
                        else: j += 8
                    else:
                        txt.append(chr(c)); j += 1
                s = ''.join(txt).strip()
                if s: out.append(s)
    return '\n'.join(out)
for p in sys.argv[1:]:
    t = extract(p)
    open(p.rsplit('.',1)[0] + '.txt', 'w', encoding='utf-8', errors='replace').write(t.encode('utf-16','surrogatepass').decode('utf-16','replace'))
    print('=====', p, len(t), 'chars =====')
    print(t[:6000])
