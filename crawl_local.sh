#!/bin/zsh
# Local crawl: one process per host (never two crawls on the same host at once).
cd "$(dirname "$0")/crawler"
PY=../.venv/bin/python
MIN=${1:-90}
group() { name=$1; shift; per=$(( MIN / $# )); for s in "$@"; do
  $PY -m qarin.run discover --store $s; $PY -m qarin.run crawl --store $s --minutes $per --max-pages 20000; done > ../logs/$name.log 2>&1; }
group sharafdg-bh sharafdg-bh & group sharafdg-ae sharafdg-ae & group sharafdg-om sharafdg-om &
group extra extra-bh extra-sa extra-om & group jarir jarir-bh jarir-sa jarir-kw jarir-qa &
group ashrafs ashrafs-bh & group jumbo jumbo-ae & group almanea almanea-sa & group saco saco-sa &
group alsaif alsaif-sa & group xcite xcite-kw & group jumbosouq jumbosouq-qa & group ansar ansar-qa &
wait
$PY -m qarin.run match > ../logs/match.log 2>&1
$PY -m qarin.run stats >> ../logs/match.log 2>&1
echo DONE >> ../logs/match.log
