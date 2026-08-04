import re, subprocess, sys, os, tempfile

path = sys.argv[1]
src = open(path, encoding="utf-8").read()
blocos = re.findall(r'<script\b([^>]*)>([\s\S]*?)</script>', src, re.I)
erros = 0
n = 0
for attrs, corpo in blocos:
    if "src=" in attrs.lower():
        continue
    if "application/json" in attrs.lower():
        continue
    n += 1
    tipo_mod = "module" in attrs.lower()
    with tempfile.NamedTemporaryFile("w", suffix=".mjs" if tipo_mod else ".js",
                                     delete=False, encoding="utf-8") as f:
        f.write(corpo)
        tmp = f.name
    r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
    if r.returncode != 0:
        erros += 1
        print("ERRO no bloco %d (%s):" % (n, attrs.strip() or "sem atributos"))
        print(r.stderr[:3000])
    os.unlink(tmp)
print("Blocos verificados:", n, "| erros:", erros)
sys.exit(1 if erros else 0)
