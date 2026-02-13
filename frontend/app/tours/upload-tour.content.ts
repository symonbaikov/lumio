/**
 * Content для тура по модалке загрузки
 */

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'upload-tour',
  content: {
    name: t({
      ru: 'Тур по загрузке',
      en: 'Upload Tour',
      kk: 'Жүктеу турі',
    }),
    description: t({
      ru: 'Узнайте как загружать банковские выписки',
      en: 'Learn how to upload bank statements',
      kk: 'Банк үзінділерін жүктеуді үйреніңіз',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Загрузка выписок 📤',
          en: 'Upload Statements 📤',
          kk: 'Үзінділерді жүктеу 📤',
        }),
        description: t({
          ru: 'Здесь вы можете загрузить банковские выписки в форматах PDF или CSV. Система автоматически распознает формат и извлечет транзакции.',
          en: 'Here you can upload bank statements in PDF or CSV formats. The system will automatically recognize the format and extract transactions.',
          kk: 'Мұнда банк үзінділерін PDF немесе CSV форматтарында жүктей аласыз. Жүйе форматты автоматты түрде танып, транзакцияларды алады.',
        }),
      },
      uploadButton: {
        title: t({
          ru: 'Кнопка загрузки 🎯',
          en: 'Upload Button 🎯',
          kk: 'Жүктеу батырмасы 🎯',
        }),
        description: t({
          ru: 'Нажмите на эту кнопку, чтобы открыть окно загрузки файлов. Вы также можете использовать кнопку в пустом состоянии таблицы.',
          en: 'Click this button to open the file upload window. You can also use the button in the empty table state.',
          kk: 'Файлдарды жүктеу терезесін ашу үшін осы батырманы басыңыз. Сондай-ақ бос кесте күйіндегі батырманы пайдалана аласыз.',
        }),
      },
      dragDrop: {
        title: t({
          ru: 'Drag & Drop зона 📁',
          en: 'Drag & Drop Zone 📁',
          kk: 'Drag & Drop аймағы 📁',
        }),
        description: t({
          ru: 'Перетащите файлы сюда или кликните для выбора. Поддерживаются форматы PDF, Excel, CSV и изображения. Максимум 5 файлов до 10 МБ каждый.',
          en: 'Drag files here or click to select. PDF, Excel, CSV and image formats are supported. Maximum 5 files up to 10 MB each.',
          kk: 'Файлдарды мұнда сүйреңіз немесе таңдау үшін басыңыз. PDF, Excel, CSV және сурет форматтары қолдау көрсетіледі. Әрқайсысы 10 МБ дейін максимум 5 файл.',
        }),
      },
      allowDuplicates: {
        title: t({
          ru: 'Разрешить дубликаты ✅',
          en: 'Allow Duplicates ✅',
          kk: 'Қосарларға рұқсат ету ✅',
        }),
        description: t({
          ru: 'По умолчанию система проверяет файлы на дубликаты. Включите эту опцию, если хотите загрузить файл повторно.',
          en: 'By default, the system checks files for duplicates. Enable this option if you want to upload a file again.',
          kk: 'Әдепкі бойынша жүйе файлдарды қосарларға тексереді. Файлды қайта жүктегіңіз келсе, бұл опцияны қосыңыз.',
        }),
      },
      fileList: {
        title: t({
          ru: 'Список файлов 📋',
          en: 'File List 📋',
          kk: 'Файлдар тізімі 📋',
        }),
        description: t({
          ru: 'Выбранные файлы отображаются здесь с информацией о размере. Вы можете удалить ненужные файлы нажав на крестик.',
          en: 'Selected files are displayed here with size information. You can remove unwanted files by clicking the X button.',
          kk: 'Таңдалған файлдар мұнда өлшем туралы ақпаратпен көрсетіледі. X батырмасын басу арқылы қажетсіз файлдарды жоя аласыз.',
        }),
      },
      uploadFiles: {
        title: t({
          ru: 'Загрузить файлы 🚀',
          en: 'Upload Files 🚀',
          kk: 'Файлдарды жүктеу 🚀',
        }),
        description: t({
          ru: 'Нажмите эту кнопку, чтобы начать загрузку всех выбранных файлов на сервер. Файлы будут автоматически обработаны и транзакции извлечены.',
          en: 'Click this button to start uploading all selected files to the server. Files will be automatically processed and transactions extracted.',
          kk: 'Барлық таңдалған файлдарды серверге жүктеуді бастау үшін осы батырманы басыңыз. Файлдар автоматты түрде өңделеді және транзакциялар алынады.',
        }),
      },
      completed: {
        title: t({
          ru: 'Отлично! 🎉',
          en: 'Great! 🎉',
          kk: 'Керемет! 🎉',
        }),
        description: t({
          ru: 'Теперь вы знаете, как работать с банковскими выписками в Lumio. Попробуйте загрузить свою первую выписку!',
          en: 'Now you know how to work with bank statements in Lumio. Try uploading your first statement!',
          kk: 'Енді сіз Lumio-да банк үзінділерімен қалай жұмыс істеу керектігін білесіз. Бірінші үзіндіңізді жүктеп көріңіз!',
        }),
      },
    },
  },
} satisfies Dictionary;

export default content;
