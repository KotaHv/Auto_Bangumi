FROM alpine:3.20 AS base

RUN apk add --no-cache --update bash python3 su-exec shadow tini tzdata && \
    mkdir -p /home/ab && \
    addgroup -S ab -g 911 && \
    adduser -S ab -G ab -h /home/ab -s /sbin/nologin -u 911

FROM base AS builder

RUN apk add --no-cache --update py3-pip

COPY backend/requirements.lock .
RUN PYTHONDONTWRITEBYTECODE=1 pip install --break-system-packages --user -r requirements.lock

FROM base

ENV LANG="C.UTF-8" \
    TZ=Asia/Shanghai \
    PUID=1000 \
    PGID=1000 \
    UMASK=022

WORKDIR /app

COPY --from=builder /root/.local /home/ab/.local
COPY --chmod=755 backend/src/. .
COPY --chmod=755 entrypoint.sh /entrypoint.sh

ENTRYPOINT ["tini", "-g", "--", "/entrypoint.sh"]

EXPOSE 7892
VOLUME [ "/app/config" , "/app/data" ]
