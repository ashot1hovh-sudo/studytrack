'use client'
import { useState } from 'react'
import {
  CreditCard, Camera, ShieldCheck, GraduationCap, FileText,
  Stethoscope, Landmark, PenLine, Video, UserCheck, ClipboardList,
  Check, ChevronDown, ChevronUp,
} from 'lucide-react'

const docs = [
  {
    id: 1,
    title: 'Загранпаспорт',
    Icon: CreditCard,
    tag: 'Обязательно',
    tagColor: 'danger' as const,
    expiry: null,
    checks: [
      'Срок действия — весь период бакалавриата',
      'Правильное написание имени и фамилии',
      'Данные совпадают с другими документами',
      'Хорошее качество скана',
      'Есть пустые страницы',
    ],
    note: 'Если паспорт скоро заканчивается — сначала оформите новый, потом подавайте.',
  },
  {
    id: 2,
    title: 'Фото',
    Icon: Camera,
    tag: 'Обязательно',
    tagColor: 'danger' as const,
    expiry: null,
    checks: [
      'Лицо хорошо видно',
      'Фон ровный — белый или синий',
      'Фото не размытое',
      'Одежда не сливается с фоном',
      'Формат и размер соответствуют требованиям портала',
    ],
    note: 'Не фотографируйтесь в светлой или синей одежде.',
  },
  {
    id: 3,
    title: 'Справка о несудимости',
    Icon: ShieldCheck,
    tag: 'Часто нужна',
    tagColor: 'warning' as const,
    expiry: '6 месяцев',
    checks: [
      'Имя студента верное',
      'Дата выдачи актуальна',
      'Срок действия не истёк',
      'Есть печать',
      'Подходит российская или нужна китайская справка',
      'Нужен ли перевод',
    ],
    note: 'Делается дольше остальных — заказывайте первой. Срок действия — 6 месяцев.',
  },
  {
    id: 4,
    title: 'Аттестат / диплом',
    Icon: GraduationCap,
    tag: 'Обязательно',
    tagColor: 'danger' as const,
    expiry: null,
    checks: [
      'Документ читаемый',
      'Есть подписи и печати',
      'Имя совпадает с паспортом',
      'Переведён, если требуется',
    ],
    note: 'Если ещё учитесь — нужна справка из школы с датой выпуска.',
  },
  {
    id: 5,
    title: 'Оценки за 10–11 класс',
    Icon: FileText,
    tag: 'Обязательно',
    tagColor: 'danger' as const,
    expiry: null,
    checks: [
      'Оценки за нужный период',
      'Документ выдан школой или колледжем',
      'Есть подписи и печати',
      'Понятна шкала оценивания',
      'Переведён, если требуется',
    ],
    note: 'Особенно важны профильные предметы: математика, физика, химия, информатика.',
  },
  {
    id: 6,
    title: 'Медицинская форма',
    Icon: Stethoscope,
    tag: 'Обязательно',
    tagColor: 'danger' as const,
    expiry: '6 месяцев',
    checks: [
      'Дата обследования актуальна',
      'Подписи врачей есть',
      'Печати есть',
      'Анализы прикреплены',
      'Все обязательные поля заполнены',
      'Форма подходит конкретному университету',
    ],
    note: 'Срок действия — 6 месяцев. Не делайте слишком рано.',
  },
  {
    id: 7,
    title: 'Банковская выписка',
    Icon: Landmark,
    tag: 'Часто нужна',
    tagColor: 'warning' as const,
    expiry: null,
    checks: [
      'Сумма покрывает год обучения',
      'Валюта подходит',
      'Дата выписки актуальна',
      'Имя владельца счёта верное',
      'Нужен ли перевод',
      'Принимает ли вуз выписку от родителя',
    ],
    note: 'Нужна сумма на год: обучение + жильё + питание + страховка + расходы.',
  },
  {
    id: 8,
    title: 'Мотивационное письмо',
    Icon: PenLine,
    tag: 'Обязательно',
    tagColor: 'danger' as const,
    expiry: null,
    checks: [
      'Объясняет, почему выбран Китай',
      'Объясняет, почему выбрана программа',
      'Объясняет, почему выбран этот университет',
      'Конкретно, не общими фразами',
      'Описывает академические интересы и планы',
    ],
    note: 'Не общий текст — объясните, почему именно эта программа логична для вас.',
  },
  {
    id: 9,
    title: 'Видео-визитка',
    Icon: Video,
    tag: 'Иногда нужна',
    tagColor: 'info' as const,
    expiry: null,
    checks: [
      'Видео не слишком длинное',
      'Звук хороший',
      'Лицо видно',
      'Фон аккуратный',
      'Студент говорит понятно',
      'Содержание совпадает с мотивационным письмом',
    ],
    note: 'Короткое селфи-видео о себе — частично повторяет мотивационное письмо.',
  },
  {
    id: 10,
    title: 'Рекомендательные письма',
    Icon: UserCheck,
    tag: 'Часто нужны',
    tagColor: 'warning' as const,
    expiry: null,
    checks: [
      'От преподавателей, наставников или работодателей',
      'Конкретные, не общими фразами',
      'Автор письма действительно знает студента',
    ],
    note: 'Выбирайте тех, кто знает вас и может написать конкретно.',
  },
  {
    id: 11,
    title: 'Онлайн-заявка',
    Icon: ClipboardList,
    tag: 'Обязательно',
    tagColor: 'danger' as const,
    expiry: null,
    checks: [
      'Личные и паспортные данные верные',
      'Программа и язык обучения выбраны',
      'Документы загружены',
      'Результаты экзаменов внесены',
      'Application fee оплачен, если нужен',
    ],
    note: 'Каждый университет — свой портал. Заполнение будем разбирать отдельно.',
  },
]

const tagColorMap = {
  danger:  { bg: 'bg-red-50', text: 'text-red-500' },
  warning: { bg: 'bg-study-orange/10', text: 'text-study-orange' },
  info:    { bg: 'bg-blue-50', text: 'text-blue-500' },
}

export default function DocumentCards() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="py-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {docs.map((doc) => {
          const isOpen = open === doc.id
          const { Icon } = doc
          const tc = tagColorMap[doc.tagColor]
          return (
            <div
              key={doc.id}
              onClick={() => setOpen(isOpen ? null : doc.id)}
              className={`bg-white rounded-xl p-4 cursor-pointer transition-all ${
                isOpen ? 'border-2 border-study-brown shadow-sm' : 'border border-study-lightgray'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <Icon className="w-5 h-5 text-study-gray shrink-0" />
                <span className="font-medium text-sm text-study-dark flex-1">{doc.title}</span>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-study-gray shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-study-gray shrink-0" />
                }
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>
                  {doc.tag}
                </span>
                {doc.expiry && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-study-orange/10 text-study-orange">
                    Срок: {doc.expiry}
                  </span>
                )}
              </div>

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-study-lightgray">
                  <p className="text-xs font-medium text-study-gray mb-2">Что проверить:</p>
                  <ul className="flex flex-col gap-1.5">
                    {doc.checks.map((check, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-study-dark">
                        <Check className="w-3.5 h-3.5 text-study-green mt-0.5 shrink-0" />
                        {check}
                      </li>
                    ))}
                  </ul>
                  {doc.note && (
                    <p className="text-xs text-study-gray bg-study-bg rounded-lg px-2.5 py-2 mt-2.5">
                      {doc.note}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-study-gray mt-2.5">Нажмите на документ, чтобы увидеть детали</p>
    </div>
  )
}
