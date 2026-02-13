import { type DeclarationContent, t } from 'intlayer';

/**
 * Контент для тура по админ-панели
 */
export const adminTourContent = {
  key: 'admin-tour-content',
  content: {
    name: t({
      ru: 'Тур по админ-панели',
      en: 'Admin Panel Tour',
      kk: 'Әкімші панелі туры',
    }),
    description: t({
      ru: 'Управление системой и мониторинг',
      en: 'System management and monitoring',
      kk: 'Жүйені басқару және мониторинг',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в админ-панель',
          en: 'Welcome to Admin Panel',
          kk: 'Әкімші панеліне қош келдіңіз',
        }),
        description: t({
          ru: 'Здесь вы можете управлять всей системой: пользователями, воркспейсами, настройками и мониторингом. Это мощный инструмент для администраторов. Давайте разберемся!',
          en: "Here you can manage the entire system: users, workspaces, settings and monitoring. This is a powerful tool for administrators. Let's explore!",
          kk: 'Мұнда сіз бүкіл жүйені басқара аласыз: пайдаланушылар, жұмыс кеңістіктері, баптаулар және мониторинг. Бұл әкімшілер үшін қуатты құрал. Танысайық!',
        }),
      },
      usersManagement: {
        title: t({
          ru: 'Управление пользователями',
          en: 'User Management',
          kk: 'Пайдаланушыларды басқару',
        }),
        description: t({
          ru: 'Просматривайте всех пользователей системы, управляйте их статусами, ролями и правами доступа. Блокируйте подозрительные аккаунты и отслеживайте активность.',
          en: 'View all system users, manage their statuses, roles and access rights. Block suspicious accounts and track activity.',
          kk: 'Барлық жүйе пайдаланушыларын қараңыз, олардың күйлерін, рөлдерін және қол жеткізу құқықтарын басқарыңыз. Күдікті аккаунттарды бұғаттаңыз және белсенділікті бақылаңыз.',
        }),
      },
      workspacesOverview: {
        title: t({
          ru: 'Обзор воркспейсов',
          en: 'Workspaces Overview',
          kk: 'Жұмыс кеңістіктеріне шолу',
        }),
        description: t({
          ru: 'Мониторьте все воркспейсы: количество пользователей, использование ресурсов, статус подписок. Управляйте лимитами и квотами для каждого воркспейса.',
          en: 'Monitor all workspaces: number of users, resource usage, subscription status. Manage limits and quotas for each workspace.',
          kk: 'Барлық жұмыс кеңістіктерін бақылаңыз: пайдаланушылар саны, ресурстарды пайдалану, жазылым күйі. Әрбір жұмыс кеңістігі үшін шектер мен квоталарды басқарыңыз.',
        }),
      },
      systemSettings: {
        title: t({
          ru: 'Системные настройки',
          en: 'System Settings',
          kk: 'Жүйе баптаулары',
        }),
        description: t({
          ru: 'Настраивайте глобальные параметры системы: лимиты загрузок, размеры хранилища, интервалы обработки, email-уведомления и другие критичные параметры.',
          en: 'Configure global system parameters: upload limits, storage sizes, processing intervals, email notifications and other critical parameters.',
          kk: 'Жүйенің жаһандық параметрлерін теңшеңіз: жүктеу шектері, қойма өлшемдері, өңдеу аралықтары, email-хабарландырулар және басқа маңызды параметрлер.',
        }),
      },
      monitoring: {
        title: t({
          ru: 'Мониторинг системы',
          en: 'System Monitoring',
          kk: 'Жүйені мониторингілеу',
        }),
        description: t({
          ru: 'Отслеживайте состояние системы в реальном времени: использование CPU, памяти, дискового пространства. Просматривайте логи ошибок и производительности для быстрой диагностики проблем.',
          en: 'Track system status in real-time: CPU usage, memory, disk space. View error logs and performance metrics for quick problem diagnosis.',
          kk: 'Жүйе күйін нақты уақытта бақылаңыз: CPU, жад, дискілік кеңістік пайдаланылуы. Мәселелерді жылдам диагностикалау үшін қате журналдарын және өнімділік көрсеткіштерін қараңыз.',
        }),
      },
      auditLog: {
        title: t({
          ru: 'Журнал аудита',
          en: 'Audit Log',
          kk: 'Аудит журналы',
        }),
        description: t({
          ru: 'Просматривайте все действия администраторов и пользователей: изменения настроек, создание/удаление объектов, доступ к данным. Используйте для расследования инцидентов безопасности.',
          en: 'View all administrator and user actions: settings changes, object creation/deletion, data access. Use for security incident investigation.',
          kk: 'Барлық әкімші және пайдаланушы әрекеттерін қараңыз: баптаулардағы өзгерістер, объектілерді жасау/жою, деректерге қол жеткізу. Қауіпсіздік оқиғаларын тергеу үшін пайдаланыңыз.',
        }),
      },
      completed: {
        title: t({
          ru: 'Отлично!',
          en: 'Great!',
          kk: 'Тамаша!',
        }),
        description: t({
          ru: 'Теперь вы знаете, как управлять системой через админ-панель. Используйте эти инструменты ответственно для поддержания стабильной работы Lumio!',
          en: 'Now you know how to manage the system through the admin panel. Use these tools responsibly to maintain stable Lumio operation!',
          kk: 'Енді сіз әкімші панелі арқылы жүйені қалай басқаруды білесіз. Lumio тұрақты жұмыс істеуін қолдау үшін бұл құралдарды жауапкершілікпен пайдаланыңыз!',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default adminTourContent;
