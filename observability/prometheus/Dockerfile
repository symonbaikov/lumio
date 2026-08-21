FROM prom/prometheus:v2.50.1

USER root

COPY observability/prometheus.railway.yml /etc/prometheus/prometheus.yml.tmpl
COPY observability/prometheus/rules /etc/prometheus/rules
COPY observability/prometheus/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Вернуться к непривилегированному пользователю образа (uid 65534)
USER nobody

ENTRYPOINT ["/entrypoint.sh"]
