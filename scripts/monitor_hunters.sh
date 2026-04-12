#!/bin/bash
LOG_DIR=~/shiny_farm/logs
NTFY_TOPIC="shiny-farm-$(whoami)-$(hostname)"

declare -A SHINY_MILESTONES
SHINY_MILESTONES[862]="10%"
SHINY_MILESTONES[1726]="19%"
SHINY_MILESTONES[2597]="27%"
SHINY_MILESTONES[3476]="35%"
SHINY_MILESTONES[4369]="41%"
SHINY_MILESTONES[5678]="50%"
SHINY_MILESTONES[8192]="63%"
SHINY_MILESTONES[13863]="82%"
SHINY_MILESTONES[18862]="90%"
SHINY_MILESTONES[26390]="96%"
SHINY_MILESTONES[37710]="99%"

declare -A NOTIFIED
declare -A HIT_NOTIFIED

echo "Monitoring shiny farm..."
echo "Subscribe to ntfy topic: $NTFY_TOPIC"
echo ""

while true; do
    TOTAL=$(grep -ch "Attempt" "$LOG_DIR"/instance_*.log 2>/dev/null | awk '{sum+=$1} END {print sum+0}')

    # Check for hits per instance
    for logfile in "$LOG_DIR"/instance_*.log; do
        inst=$(basename "$logfile" .log)
        if [ -n "${HIT_NOTIFIED[$inst]}" ]; then
            continue
        fi
        HIT=$(grep '!!!' "$logfile" 2>/dev/null | tail -1)
        if [ -n "$HIT" ]; then
            HIT_NOTIFIED[$inst]=1
            notify-send -u critical "SHINY FARM HIT! ($inst)" "$HIT" 2>/dev/null
            curl -s \
                -H "Title: SHINY FARM HIT! ($inst)" \
                -H "Priority: urgent" \
                -H "Tags: sparkles,pokemon" \
                -d "$HIT" \
                "https://ntfy.sh/$NTFY_TOPIC" >/dev/null 2>&1
            echo ""
            echo "=========================================="
            echo "  HIT FOUND! ($inst)"
            echo "  $HIT"
            echo "=========================================="
            paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null &
        fi
    done

    # Check shiny probability milestones
    for threshold in "${!SHINY_MILESTONES[@]}"; do
        pct="${SHINY_MILESTONES[$threshold]}"
        if [ "$TOTAL" -ge "$threshold" ] && [ -z "${NOTIFIED[$threshold]}" ]; then
            NOTIFIED[$threshold]=1
            MSG="$TOTAL attempts — $pct chance a shiny should have appeared by now"
            echo "[$(date +%H:%M:%S)] $MSG"
            curl -s \
                -H "Title: Shiny Farm: $pct milestone" \
                -H "Priority: default" \
                -H "Tags: pokemon" \
                -d "$MSG" \
                "https://ntfy.sh/$NTFY_TOPIC" >/dev/null 2>&1
        fi
    done

    sleep 30
done
