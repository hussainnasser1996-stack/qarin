#!/bin/zsh
cd "$(dirname "$0")/crawler"; PY=../.venv/bin/python
grp() { name=$1; per=$2; shift 2; for s in "$@"; do $PY -m qarin.run discover --store $s; $PY -m qarin.run crawl --store $s --minutes $per --max-pages 20000; done > ../logs/$name.log 2>&1; }
grp lulu 12 lulu-bh lulu-ae lulu-sa lulu-kw lulu-qa lulu-om &
grp ourshopee 14 ourshopee-bh ourshopee-ae ourshopee-kw ourshopee-om ourshopee-qa &
grp ansar 40 ansar-qa &
grp xcite 40 xcite-kw &
wait
