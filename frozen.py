import hashlib, re, sys

ALVOS = [
    ("function", "linhaMaster"),
    ("function", "exportarMasterCSV"),
    ("function", "exportarMasterXLS"),
    ("function", "exportarMasterXLSXFotos"),
    ("function", "catByKey"),
    ("function", "calcRisco"),
    ("const", "GRUPOS_MASTER"),
]

def extrai(src, tipo, nome):
    if tipo == "function":
        pats = [r'\bfunction\s+%s\s*\(' % re.escape(nome),
                r'\basync\s+function\s+%s\s*\(' % re.escape(nome)]
    else:
        pats = [r'\bconst\s+%s\s*=' % re.escape(nome)]
    ini = None
    for p in pats:
        m = re.search(p, src)
        if m:
            ini = m.start()
            break
    if ini is None:
        return None
    i = ini
    if tipo == "function":
        # pula a lista de parametros (pode conter { } de desestruturacao)
        p = src.index("(", ini)
        prof_p = 0
        while p < len(src):
            if src[p] == "(":
                prof_p += 1
            elif src[p] == ")":
                prof_p -= 1
                if prof_p == 0:
                    break
            p += 1
        i = p
    # avanca ate o primeiro { ou [ e faz balanceamento
    abre = None
    while i < len(src):
        if src[i] in "{[":
            abre = src[i]
            break
        i += 1
    if abre is None:
        return None
    fecha = "}" if abre == "{" else "]"
    prof = 0
    j = i
    em_str = None
    while j < len(src):
        ch = src[j]
        if em_str:
            if ch == "\\":
                j += 2
                continue
            if ch == em_str:
                em_str = None
        else:
            if ch in "\"'`":
                em_str = ch
            elif ch == abre:
                prof += 1
            elif ch == fecha:
                prof -= 1
                if prof == 0:
                    return src[ini:j + 1]
        j += 1
    return None

def mapa(path):
    src = open(path, encoding="utf-8").read()
    out = {}
    for tipo, nome in ALVOS:
        t = extrai(src, tipo, nome)
        out[nome] = (hashlib.sha256(t.encode("utf-8")).hexdigest(), len(t)) if t else (None, 0)
    return out

a = mapa(sys.argv[1])
b = mapa(sys.argv[2])
falhou = False
for _, nome in ALVOS:
    ha, la = a[nome]
    hb, lb = b[nome]
    ok = ha is not None and ha == hb
    if not ok:
        falhou = True
    print(("OK  " if ok else "ERRO"), nome, "orig:", (ha or "AUSENTE")[:16], la, "| novo:", (hb or "AUSENTE")[:16], lb)
print("RESULTADO:", "FALHOU" if falhou else "TODOS IDENTICOS")
sys.exit(1 if falhou else 0)
