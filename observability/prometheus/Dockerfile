FROM prom/prometheus:v2.50.1

USER root

COPY observability/prometheus.railway.yml /etc/prometheus/prometheus.yml.tmpl
COPY observability/prometheus/rules /etc/prometheus/rules
COPY observability/prometheus/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Back to the image's default unprivileged user (uid 65534); /etc/prometheus
# and /prometheus are both owned by nobody, so the entrypoint can still render
# the config template and touch the TSDB directory.
USER nobody

ENTRYPOINT ["/entrypoint.sh"]
