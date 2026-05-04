-- 1. Create a Supabase Auth user first.
-- 2. Replace the value below with that user's auth.users.id.
-- 3. Run this file in the Supabase SQL editor.

do $$
declare
  student_uuid uuid := '010eee79-6eb7-4407-99be-8182211f6367';
begin
  insert into public.students (id, email, full_name, role)
  values (student_uuid, 'ashot1hovh@gmail.com', 'Ashot H.', 'student')
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role;

  insert into public.roadmap_stages (student_id, stage_name, status, description, order_index) values
  (student_uuid, 'Подготовка документов', 'completed', 'Все документы собраны и переведены', 1),
  (student_uuid, 'Подача заявок', 'completed', 'Заявки поданы во все выбранные вузы', 2),
  (student_uuid, 'Ожидание ответов', 'current', 'Сейчас мы ждём ответа от 3 вузов. Ожидаемые даты: конец мая', 3),
  (student_uuid, 'Зачисление', 'pending', 'После получения положительных ответов', 4),
  (student_uuid, 'Виза и релокация', 'pending', 'Подготовка документов для визы', 5);

  insert into public.universities (student_id, name, status, deadline, portal_url, consultant_note, order_index) values
  (student_uuid, 'Технический университет Мюнхена', 'applied', '2026-05-15', 'https://portal.tum.de', 'Ожидаем ответ к концу мая. Студент имеет хорошие шансы на стипендию.', 1),
  (student_uuid, 'Университет Амстердама', 'response', '2026-04-01', 'https://www.uva.nl', 'Получили условное зачисление. Нужно подтвердить до 15 мая.', 2),
  (student_uuid, 'ETH Цюрих', 'planned', '2026-04-15', 'https://ethz.ch', 'Подготовка мотивационного письма. Конкурсная программа.', 3),
  (student_uuid, 'Политехническая школа Парижа', 'rejected', '2026-03-01', 'https://www.polytechnique.edu', 'Отказ из-за отсутствия французского языкового сертификата.', 4);

  insert into public.documents (student_id, name, status, deadline, order_index) values
  (student_uuid, 'Аттестат о среднем образовании', 'completed', '2026-03-15', 1),
  (student_uuid, 'Справка о здоровье (форма 082)', 'in_progress', '2026-04-25', 2),
  (student_uuid, 'Перевод документов (нотариальный)', 'in_progress', '2026-04-30', 3),
  (student_uuid, 'Рекомендательное письмо', 'not_started', '2026-05-10', 4),
  (student_uuid, 'Мотивационное письмо', 'not_started', '2026-05-10', 5),
  (student_uuid, 'Справка о финансовом обеспечении', 'not_started', '2026-05-15', 6),
  (student_uuid, 'Копия паспорта (все страницы)', 'completed', '2026-03-15', 7);

  insert into public.deadlines (student_id, title, date, university_name, context, is_urgent, order_index) values
  (student_uuid, 'Дедлайн подачи документов', '2026-04-15', 'Технический университет Мюнхена', 'После этого вуз переходит к рассмотрению (обычно 4-6 недель)', true, 1),
  (student_uuid, 'Загрузка скана аттестата', '2026-04-25', 'Все вузы', 'Необходимый документ для всех поданных заявок', true, 2),
  (student_uuid, 'Подтверждение зачисления', '2026-05-01', 'Университет Амстердама', 'Условное зачисление необходимо подтвердить оплатой депозита', false, 3),
  (student_uuid, 'Подача заявки на визу', '2026-05-15', 'Консульство Германии', 'Рекомендуем начать подготовку документов заранее', false, 4);

  insert into public.next_actions (student_id, title, deadline, action_button_text, is_active)
  values (student_uuid, 'Загрузите скан аттестата', '2026-04-25', 'Загрузить', true);
end $$;
