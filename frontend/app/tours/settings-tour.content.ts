import { type DeclarationContent, t } from 'intlayer';

/**
 * Розширений контент для тура по робочому простору
 */
export const settingsTourContent = {
  key: 'settings-tour-content',
  content: {
    name: t({
      ru: 'Тур по рабочему пространству',
      en: 'Workspace Tour',
      kk: 'Жұмыс кеңістігі туры',
    }),
    description: t({
      ru: 'Управление командой и доступом',
      en: 'Manage team and access',
      kk: 'Команданы және қолжетімділікті басқару',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в рабочее пространство',
          en: 'Welcome to Workspace',
          kk: 'Жұмыс кеңістігіне қош келдіңіз',
        }),
        description: t({
          ru: 'Рабочее пространство — это место, где вы управляете командой и доступом к данным. Приглашайте коллег, назначайте роли и настраивайте права доступа для каждого участника. Давайте разберемся во всех возможностях совместной работы!',
          en: "Workspace is where you manage your team and data access. Invite colleagues, assign roles, and configure access rights for each member. Let's explore all collaboration features!",
          kk: 'Жұмыс кеңістігі — бұл командаңызды және деректерге қол жеткізуді басқаратын жер. Әріптестерді шақырыңыз, рөлдерді тағайындаңыз және әрбір мүше үшін қол жеткізу құқықтарын теңшеңіз. Бірлескен жұмыстың барлық мүмкіндіктерін зерттейік!',
        }),
      },
      members: {
        title: t({
          ru: 'Участники рабочего пространства',
          en: 'Workspace Members',
          kk: 'Жұмыс кеңістігі мүшелері',
        }),
        description: t({
          ru: 'Здесь отображаются все участники вашего рабочего пространства. Вы видите их имена, email и роли. Владелец и администраторы могут управлять доступом участников — изменять роли или отзывать доступ через меню действий.',
          en: 'All members of your workspace are displayed here. You see their names, emails, and roles. Owner and admins can manage member access — change roles or revoke access via the actions menu.',
          kk: 'Мұнда жұмыс кеңістігіңіздің барлық мүшелері көрсетіледі. Сіз олардың аттарын, email-дерін және рөлдерін көресіз. Иесі мен әкімшілер мүшелердің қол жеткізуін басқара алады — әрекеттер мәзірі арқылы рөлдерді өзгертуге немесе қол жеткізуді қайтарып алуға болады.',
        }),
      },
      memberCard: {
        title: t({
          ru: 'Карточка участника',
          en: 'Member Card',
          kk: 'Мүше картасы',
        }),
        description: t({
          ru: 'Каждая карточка показывает имя, email и роль участника. Роли обозначены цветными метками: Владелец (синяя) — полный контроль, Администратор (фиолетовая) — управление командой, Участник (серая) — работа с данными. Нажмите на три точки, чтобы отозвать доступ (доступно только администраторам).',
          en: "Each card shows member's name, email, and role. Roles are marked with colored badges: Owner (blue) — full control, Admin (purple) — team management, Member (gray) — data work. Click three dots to revoke access (admins only).",
          kk: 'Әрбір карта мүшенің атын, email-ін және рөлін көрсетеді. Рөлдер түрлі-түсті белгілермен белгіленген: Иесі (көк) — толық бақылау, Әкімші (күлгін) — команданы басқару, Мүше (сұр) — деректермен жұмыс. Қол жеткізуді қайтарып алу үшін үш нүктеге басыңыз (тек әкімшілерге).',
        }),
      },
      inviteForm: {
        title: t({
          ru: 'Форма приглашения',
          en: 'Invitation Form',
          kk: 'Шақыру пішіні',
        }),
        description: t({
          ru: 'Эта форма позволяет пригласить новых участников в рабочее пространство. Введите email коллеги, выберите роль и настройте права доступа. После отправки приглашения будет создана уникальная ссылка, которую можно скопировать и передать приглашённому.',
          en: "This form allows you to invite new members to the workspace. Enter colleague's email, select a role, and configure access rights. After sending, a unique link will be created that you can copy and share with the invitee.",
          kk: 'Бұл пішін жаңа мүшелерді жұмыс кеңістігіне шақыруға мүмкіндік береді. Әріптестің email-ін енгізіңіз, рөлді таңдаңыз және қол жеткізу құқықтарын теңшеңіз. Жіберілгеннен кейін бірегей сілтеме жасалады, оны көшіріп, шақырылғанға жібере аласыз.',
        }),
      },
      inviteEmail: {
        title: t({
          ru: 'Email приглашённого',
          en: 'Invitee Email',
          kk: 'Шақырылған email',
        }),
        description: t({
          ru: 'Введите email адрес человека, которого хотите пригласить. На этот адрес придёт уведомление о приглашении, если у вас настроена email-интеграция. Даже без email-уведомлений вы сможете скопировать ссылку-приглашение и отправить её любым удобным способом.',
          en: 'Enter the email address of the person you want to invite. A notification will be sent to this address if you have email integration configured. Even without email notifications, you can copy the invitation link and send it any way you prefer.',
          kk: 'Шақырғыңыз келетін адамның email мекенжайын енгізіңіз. Email интеграциясы теңшелсе, осы мекенжайға шақыру туралы хабарландыру жіберіледі. Email хабарландыруларынсыз-ақ шақыру сілтемесін көшіріп, қалаған тәсілмен жібере аласыз.',
        }),
      },
      roles: {
        title: t({
          ru: 'Выбор роли',
          en: 'Role Selection',
          kk: 'Рөлді таңдау',
        }),
        description: t({
          ru: 'Выберите роль для нового участника: Участник — может работать с данными, но не управляет командой; Администратор — может управлять участниками, отправлять приглашения и настраивать доступ. Роль Владелец уникальна и передаётся отдельно. Для роли Участник вы сможете настроить детальные права доступа.',
          en: "Select a role for the new member: Member — can work with data but doesn't manage the team; Admin — can manage members, send invitations, and configure access. Owner role is unique and transferred separately. For Member role, you can configure detailed access rights.",
          kk: 'Жаңа мүше үшін рөлді таңдаңыз: Мүше — деректермен жұмыс істей алады, бірақ команданы басқармайды; Әкімші — мүшелерді басқара алады, шақыру жібере алады және қол жеткізуді теңшей алады. Иесі рөлі бірегей және бөлек беріледі. Мүше рөлі үшін егжей-тегжейлі қол жеткізу құқықтарын теңшей аласыз.',
        }),
      },
      permissions: {
        title: t({
          ru: 'Права доступа',
          en: 'Access Permissions',
          kk: 'Қолжетімділік құқықтары',
        }),
        description: t({
          ru: 'Для роли Участник вы можете детально настроить права доступа к разным разделам: Выписки — загрузка и редактирование банковских выписок; Таблицы — работа с кастомными таблицами; Категории — управление категориями транзакций; Ввод данных — доступ к разделу фиксации остатков; Ссылки и доступ к файлам — возможность делиться файлами. Если галочка не установлена — участник сможет только просматривать данные в этом разделе.',
          en: 'For Member role, you can configure detailed access rights to different sections: Statements — upload and edit bank statements; Tables — work with custom tables; Categories — manage transaction categories; Data Entry — access to balance tracking section; File Sharing & Access — ability to share files. If unchecked, member can only view data in that section.',
          kk: 'Мүше рөлі үшін әртүрлі бөлімдерге егжей-тегжейлі қолжетімділік құқықтарын теңшей аласыз: Үзінділер — банк үзінділерін жүктеу және өңдеу; Кестелер — реттелетін кестелермен жұмыс; Санаттар — транзакция санаттарын басқару; Деректерді енгізу — қалдықтарды қадағалау бөліміне қол жеткізу; Файлдарды бөлісу және қол жеткізу — файлдармен бөлісу мүмкіндігі. Белгіленбесе, мүше осы бөлімдегі деректерді тек көре алады.',
        }),
      },
      sendInvite: {
        title: t({
          ru: 'Отправка приглашения',
          en: 'Send Invitation',
          kk: 'Шақыру жіберу',
        }),
        description: t({
          ru: 'Нажмите эту кнопку, чтобы создать приглашение. Система сгенерирует уникальную ссылку, которая будет действительна ограниченное время (обычно 7 дней). После создания приглашения появится уведомление с возможностью скопировать ссылку. Приглашённый сможет зарегистрироваться по этой ссылке и автоматически получит доступ к рабочему пространству с указанными правами.',
          en: 'Click this button to create an invitation. The system will generate a unique link valid for a limited time (usually 7 days). After creating, a notification will appear with the option to copy the link. The invitee can register via this link and automatically gain access to the workspace with specified permissions.',
          kk: 'Шақыру жасау үшін осы батырманы басыңыз. Жүйе шектеулі уақытқа жарамды бірегей сілтеме жасайды (әдетте 7 күн). Жасағаннан кейін сілтемені көшіру опциясы бар хабарландыру пайда болады. Шақырылған осы сілтеме арқылы тіркеле алады және көрсетілген рұқсаттармен жұмыс кеңістігіне автоматты түрде қол жеткізе алады.',
        }),
      },
      inviteLink: {
        title: t({
          ru: 'Ссылка-приглашение',
          en: 'Invitation Link',
          kk: 'Шақыру сілтемесі',
        }),
        description: t({
          ru: 'После создания приглашения здесь появится уникальная ссылка. Нажмите на иконку копирования справа, чтобы скопировать ссылку в буфер обмена. Отправьте эту ссылку коллеге любым удобным способом — по email, мессенджеру или другим каналом связи. По этой ссылке человек сможет зарегистрироваться и присоединиться к вашему рабочему пространству с заранее настроенными правами.',
          en: 'After creating an invitation, a unique link will appear here. Click the copy icon on the right to copy the link to clipboard. Send this link to your colleague any way you prefer — via email, messenger, or other communication channel. Using this link, they can register and join your workspace with pre-configured permissions.',
          kk: 'Шақыру жасағаннан кейін мұнда бірегей сілтеме пайда болады. Сілтемені алмасу буферіне көшіру үшін оң жақтағы көшіру белгішесін басыңыз. Бұл сілтемені әріптесіңізге қалаған тәсілмен жіберіңіз — email, мессенджер немесе басқа байланыс арнасы арқылы. Бұл сілтеме арқылы адам тіркеліп, алдын ала теңшелген рұқсаттармен жұмыс кеңістігіңізге қосыла алады.',
        }),
      },
      pendingInvitations: {
        title: t({
          ru: 'Ожидающие приглашения',
          en: 'Pending Invitations',
          kk: 'Күтілетін шақырулар',
        }),
        description: t({
          ru: 'В этой секции отображаются все отправленные приглашения, которые ещё не были приняты. Для каждого приглашения показан email получателя, назначенная роль и срок действия ссылки. Вы можете в любой момент скопировать ссылку повторно, если она потерялась. После того как человек зарегистрируется по ссылке, приглашение исчезнет из этого списка, а новый участник появится в списке участников выше.',
          en: "This section shows all sent invitations that haven't been accepted yet. For each invitation, you see recipient's email, assigned role, and link expiration date. You can copy the link again anytime if it was lost. Once the person registers via the link, the invitation disappears from this list, and the new member appears in the members list above.",
          kk: 'Бұл бөлім әлі қабылданбаған барлық жіберілген шақыруларды көрсетеді. Әрбір шақыру үшін алушының email-і, тағайындалған рөл және сілтеменің жарамдылық мерзімі көрсетіледі. Сілтеме жоғалса, кез келген уақытта қайтадан көшіре аласыз. Адам сілтеме арқылы тіркелгеннен кейін шақыру осы тізімнен жоғалады, ал жаңа мүше жоғарыдағы мүшелер тізімінде пайда болады.',
        }),
      },
      completed: {
        title: t({
          ru: 'Отлично!',
          en: 'Great!',
          kk: 'Тамаша!',
        }),
        description: t({
          ru: 'Теперь вы знаете, как управлять рабочим пространством. Приглашайте коллег, назначайте роли, настраивайте права доступа и эффективно работайте в команде! Lumio создан для совместной работы — используйте все возможности командного учёта.',
          en: 'Now you know how to manage your workspace. Invite colleagues, assign roles, configure access rights, and work effectively as a team! Lumio is built for collaboration — use all team accounting features.',
          kk: 'Енді сіз жұмыс кеңістігін қалай басқаруды білесіз. Әріптестерді шақырыңыз, рөлдерді тағайындаңыз, қолжетімділік құқықтарын теңшеңіз және командада тиімді жұмыс істеңіз! Lumio бірлескен жұмысқа арналған — командалық есеп айырысудың барлық мүмкіндіктерін пайдаланыңыз.',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default settingsTourContent;
