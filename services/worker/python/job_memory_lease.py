"""Hold the existing cross-container engine slots for an entire recognition job.

The owner keeps stdin open. A crash closes the pipe and releases flock; a heartbeat
is diagnostic only and never licenses a second live execution.
"""
import fcntl
import json
import os
import sys
import time

root, token, memory_mb, weight, capacity, wait_ms = sys.argv[1:]
memory_bytes, weight, capacity = int(memory_mb)*1048576, int(weight), int(capacity)
os.makedirs(root, exist_ok=True)
deadline = time.monotonic()+int(wait_ms)/1000
slots = []
big_intent = open(os.path.join(root, 'big-intent.lock'), 'a')
if weight == capacity:
    # An arriving big job lets existing engines drain, then excludes new small
    # admissions. flock ownership disappears on crash; no stale-time takeover.
    fcntl.flock(big_intent, fcntl.LOCK_SH)
memory_blocked = False
with open(os.path.join(root, 'dispatcher.lock'), 'a') as dispatcher:
    while True:
        if time.monotonic() >= deadline:
            raise RuntimeError(('ENGINE_MEMORY_PRESSURE' if memory_blocked else 'ENGINE_RESOURCE_BUSY')+': task admission is busy')
        fcntl.flock(dispatcher, fcntl.LOCK_EX)
        active = []
        try:
            for i in range(capacity):
                slot = open(os.path.join(root, f'slot-{i}.lock'), 'a+')
                try:
                    fcntl.flock(slot, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    slots.append(slot)
                except BlockingIOError:
                    slot.seek(0)
                    active.append(json.load(slot))
                    slot.close()
            with open('/proc/meminfo') as stream:
                available = next(int(line.split()[1])*1024 for line in stream if line.startswith('MemAvailable:'))
            current, limit = 0, None
            for directory, current_name, limit_name in [('/sys/fs/cgroup','memory.current','memory.max'),('/sys/fs/cgroup/memory','memory.usage_in_bytes','memory.limit_in_bytes')]:
                if os.path.exists(os.path.join(directory,current_name)):
                    with open(os.path.join(directory,current_name)) as stream: current = int(stream.read())
                    with open(os.path.join(directory,limit_name)) as stream: value=stream.read().strip()
                    limit = None if value=='max' or int(value)>=(1<<60) else int(value)
                    break
            margin = int(os.environ.get('MUSIC_ENGINE_MEMORY_MARGIN_MB','256'))*1048576
            # Full reservations from other containers are conservative. Existing
            # own RSS growth is credited exactly as in the command gate.
            group = os.uname().nodename
            own = [item for item in active if item['group']==group]
            baseline_available=max([item['host_baseline_available'] for item in own]+[available])
            baseline_current=min([item['cgroup_baseline_current'] for item in own]+[current])
            own_growth=max(0,current-baseline_current) if limit is not None else 0
            own_reserved=sum(item['memory_bytes'] for item in own)
            other_reserved=sum(item['memory_bytes'] for item in active if item['group']!=group)
            reserved=other_reserved+max(0,own_reserved-min(own_growth,max(0,baseline_available-available)))
            admitted=available>=reserved+memory_bytes+margin and (limit is None or limit-current>=max(0,own_reserved-own_growth)+memory_bytes+margin)
            memory_blocked = not admitted
            if weight < capacity:
                try:
                    fcntl.flock(big_intent, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    fcntl.flock(big_intent, fcntl.LOCK_UN)
                except BlockingIOError:
                    admitted=False
            if len(slots)>=weight and admitted:
                for slot in slots[weight:]: slot.close()
                slots=slots[:weight]
                record={'group':group,'memory_bytes':memory_bytes,'host_baseline_available':available,'cgroup_baseline_current':current,'job_token':token}
                for i,slot in enumerate(slots):
                    slot.seek(0);slot.truncate();json.dump({**record,'memory_bytes':memory_bytes if i==0 else 0},slot);slot.flush()
                print(json.dumps({'ready':True,'token':token}),flush=True)
                break
        finally:
            fcntl.flock(dispatcher,fcntl.LOCK_UN)
        for slot in slots:slot.close()
        slots=[]
        time.sleep(.05)
    # EOF only after the parent completes or dies. No stale-time takeover.
    for _ in sys.stdin: pass
for slot in slots:slot.close()
big_intent.close()
