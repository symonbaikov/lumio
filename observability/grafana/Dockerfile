FROM grafana/grafana-oss:10.4.3

USER root

COPY observability/grafana/provisioning /etc/grafana/provisioning
COPY observability/grafana/dashboards /etc/grafana/dashboards

ENV GF_USERS_ALLOW_SIGN_UP=false
# Не секрет, а булев флаг конфигурации Grafana: анонимный доступ выключен.
# Trivy срабатывает эвристикой на подстроку AUTH в имени переменной.
#trivy:ignore:AVD-DS-0031
ENV GF_AUTH_ANONYMOUS_ENABLED=false
ENV GF_SECURITY_COOKIE_SECURE=true
ENV GF_PATHS_DATA=/var/lib/grafana
ENV GF_PATHS_PROVISIONING=/etc/grafana/provisioning

# Вернуться к непривилегированному пользователю образа (uid 472)
USER grafana

ENTRYPOINT ["/run.sh"]
