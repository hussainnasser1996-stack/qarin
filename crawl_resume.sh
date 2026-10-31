#!/bin/zsh
cd "$(dirname "$0")/crawler"; PY=../.venv/bin/python
grp() { name=$1; per=$2; shift 2; for s in "$@"; do $PY -m qarin.run crawl --store $s --minutes $per --max-pages 20000; done > ../logs/$name-2.log 2>&1; }
grp sharafdg-bh 45 sharafdg-bh & grp sharafdg-ae 45 sharafdg-ae & grp jumbo 45 jumbo-ae & grp jumbosouq 45 jumbosouq-qa &
grp saco 45 saco-sa & grp ashrafs 45 ashrafs-bh &
wait
