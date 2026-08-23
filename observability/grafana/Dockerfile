FROM grafana/grafana-oss:10.4.3

USER root

COPY observability/grafana/provisioning /etc/grafana/provisioning
COPY observability/grafana/dashboards /etc/grafana/dashboards

ENV GF_USERS_ALLOW_SIGN_UP=false
ENV GF_AUTH_ANONYMOUS_ENABLED=false
ENV GF_SECURITY_COOKIE_SECURE=true
ENV GF_PATHS_DATA=/var/lib/grafana
ENV GF_PATHS_PROVISIONING=/etc/grafana/provisioning

# Back to the image's default unprivileged user (uid 472) for runtime
USER grafana

ENTRYPOINT ["/run.sh"]
