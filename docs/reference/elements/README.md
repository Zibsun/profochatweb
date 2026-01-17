# Справочник элементов курсов

Техническая спецификация всех типов элементов курсов.

## Документация для авторов курсов

- [Elements](elements.md) — полная документация по всем типам элементов для создания курсов в формате YAML
- [Пример курса](course_example.yml) — пример курса со всеми типами элементов

## Базовый класс

- [Element Base](element-base.md) — базовый класс Element

## Типы элементов

- [Message](message.md) — текстовое сообщение
- [Audio](audio.md) — аудиосообщение
- [Input](input.md) — ввод текста
- [Quiz](quiz.md) — викторина
- [Question](question.md) — опрос
- [MultiChoice](multichoice.md) — множественный выбор
- [Dialog](dialog.md) — диалог с ИИ
- [Miniapp](miniapp.md) — мини-приложение Telegram
- [Test](test.md) — итоговый тест
- [Jump](jump.md) — навигация
- [Revision](revision.md) — повторение ошибок
- [Delay](delay.md) — задержка
- [End](end.md) — завершение курса

## Регистр элементов

Элементы регистрируются в `elements/__init__.py`:

```python
element_registry = {
    "message": Message,
    "dialog": Dialog,
    "quiz": Quiz,
    # ...
}
```
