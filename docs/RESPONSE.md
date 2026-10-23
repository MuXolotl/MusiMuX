# VK API — справочник по структурам ответов VK Музыки

Документ описывает наблюдаемые JSON-формы внутреннего API (`v=8.154` по
умолчанию) и отмечает, что из них разбирает текущий Rust-клиент MusiMuX
(`crates/vkapi/src/models/`). Текущая выборка содержит 1 762 ответа по 48
методам (1 741 успешный, 21 с ошибкой); предыдущая содержала 1 765 ответов
по 22 методам. Поля и типы, не встретившиеся в текущем срезе, нельзя считать
удалёнными из API.

Примеры ниже синтетические: идентификаторы, тексты, токены, URL и значения
ответов не публикуются. Поля wire-ответа могут быть шире Rust-модели:
`serde` допускает незнакомые поля, но модель не сохраняет автоматически всё,
чего нет в её структуре. Описание сервера и данные, декодируемые или
отображаемые приложением, относятся к разным уровням.

Параметры вызовов — в [`API.md`](./API.md). Там отдельно указаны имена из
манифестов и параметры, которые формирует код клиента.

---

## 1. Конверт каталога (главный паттерн)

Методы `catalog.getAudio`, `catalog.getSection`, `catalog.getBlockItems`,
`catalog.replaceBlocks`, `catalog.getAudioSearch`, `catalog.getAudioArtist` и
`catalog.getAudioCurator` используют каталоговый конверт. Секция/блок содержит
ссылочные списки `*_ids`, а связанные объекты могут лежать отдельными массивами
в корне ответа. Не каждый метод возвращает все пакеты.

```json
{
  "audios": [ { "id": 0, "owner_id": 0, "title": "<track-title>" } ],
  "section": {
    "id": "<opaque-section-id>",
    "title": "<section-title>",
    "blocks": [
      {
        "id": "<opaque-block-id>",
        "data_type": "music_audios",
        "layout": { "name": "list" },
        "audios_ids": [ "0_0" ]
      }
    ]
  }
}
```

В общем случае клиент разрешает ссылочные ID объектами из пакетов, сохраняя
исходный порядок. Это работает только для тех типов, которые поддержаны
моделью/резолвером приложения; неизвестные пакеты не следует молча трактовать
как пустые.

### 1.1. Состав верхнего уровня по типам ответов

| Форма | Методы | Структурные ключи | Пакеты/дополнительные поля |
|---|---|---|---|
| Корневой каталог | `catalog.getAudio`, `catalog.getAudioSearch`, `catalog.getAudioArtist`, `catalog.getAudioCurator` | `catalog { default_section, sections }` | В зависимости от метода — пакеты; в поиске могут быть `suggestions`, пустой `albums` и `pinned_section` |
| Детальная секция | `catalog.getSection`, иногда `catalog.getAudio(url)` | `section` | Пакеты секции; в отдельных ответах дополнительно `hints` |
| Одиночный блок | `catalog.getBlockItems` | `block` | Пакеты блока |
| Замены вкладок | `catalog.replaceBlocks` | `replacements { new_next_from, replacements[{ from_block_ids, to_blocks }] }` | Пакеты новых блоков |

Пакеты, наблюдавшиеся в текущем наборе: `audios`, `playlists`,
`recommended_playlists`, `links`, `audio_books`, `podcasts`, `radio_stations`,
`audio_stream_mixes`, `audio_content_cards`, `catalog_banners`, `artists`,
`artist_videos`, `videos`, `concerts`, `placeholders`, `texts`, `suggestions`,
`groups`, `profiles`, `curators`, `music_owners`, `albums` (в наблюдавшемся
ответе массив пуст). `hints` — дополнительное поле конверта, не пакет сущностей. В текущем Rust
`AudioCatalog` сохраняет `default_section` и `sections`, но не `pinned_section`;
корневой `hints` также не декодируется в `CatalogPayload`.
`market_items` и `podcast_episodes` были в предыдущей выборке, но сейчас
не наблюдаются. Это не свидетельствует об удалении. Структуры, известные только
по коду, перечислены в Приложении B.

---

## 2. Модель раздела каталога (`Section`)

```json
{
  "id": "<opaque-section-id>",
  "title": "<section-title>",
  "url": "<section-url>",
  "next_from": "...",
  "icon": "<icon-name>",
  "style": { "no_top_separator": true, "navbar_overlap": true },
  "breadcrumbs": [],
  "ad_banner": {},
  "blocks": [
    { "id": "<opaque-block-id>", "data_type": "<data-type>", "layout": { "name": "<layout-name>" } }
  ]
}
```

| Поле | Тип | Описание |
|---|---|---|
| `id` | string | Opaque-идентификатор секции |
| `title` | string | Заголовок |
| `url` | string | Необязательная каноническая ссылка; в текущих `getSection` ответах присутствует в 744 из 885 |
| `icon` | string | Имя иконки навигации |
| `style` | object | Флаги оформления страницы |
| `blocks` | array | Блоки в порядке отрисовки VK |
| `next_from` | string | Курсор следующей страницы секции |
| `breadcrumbs` | array | Хлебные крошки (частые у вложенных страниц) |
| `ad_banner` | object | Рекламный баннер страницы |
| `listen_events` | array | События статистики уровня секции |

В текущих ответах `section.actions` наблюдалось в 3 секциях; также `section.next_from` был в 448 из 885 ответов, `breadcrumbs` — в 876 из 885. Корневой массив `hints` встретился в 7 ответах, по одному объекту типа `tooltip` в каждом; соответствующие кнопки могут содержать `hint_id`. Пустая секция без `blocks` допустима.

Текущий Rust `Section` сохраняет только `id`, `title`, `url`, `blocks` и `next_from`; `breadcrumbs`, `actions`, `style`, `icon`, `ad_banner`, `listen_events` и корневой `hints` не представлены в этой модели.

---

## 3. Модель контентного блока (`Block`)

Блок — скелет отрисовки: раскладка, кнопки и ссылки на сущности из пакетов конверта.

```json
{
  "id": "<opaque-block-id>",
  "data_type": "music_audios",
  "layout": { "name": "list" },
  "audios_ids": [ "0_0" ],
  "next_from": "..."
}
```

### 3.1. Полный набор полей блока

| Поле | Тип | Описание |
|---|---|---|
| `id` | string | Opaque-идентификатор блока (эфемерен — см. API.md) |
| `data_type` | string | Тип данных блока, см. §3.2 |
| `layout` | object | Раскладка отрисовки, см. §4 |
| `title` / `subtitle` | string | Заголовок и подзаголовок блока (часто дублируют `layout.title`) |
| `url` | string | Необязательная ссылка на страницу блока (`section=…&block=…`) |
| `next_from` | string | Курсор докрутки через `catalog.getBlockItems` |
| `actions` | array | Действия блока, см. §5 |
| `meta` | object | Служебные метаданные: `show_all_info` (объект `{section_id, title}` — адрес страницы «Показать всё»), `context` (например `kids_section`), `anchor` (якорь групповой кнопки, например `genres`) |
| `listen_events` | array | Имена событий статистики для элементов блока, см. §9 |
| `artist_info` | array | В текущем JSON — массив объектов artist-chip; Rust разбирает его как `Vec<ArtistChips>` (§8.15) |
| `items_count` | int | Не наблюдалось в текущих секционных блоках; не предполагать наличие |
| `buttons` | array | Отдельный массив кнопок; не объединять с `actions` до разбора схемы |
| `badge` | object | Бейдж: `{ "text": "<badge-text>", "type": "<badge-type>" }`; преимущественно у `none`, возможен и у `action` |
| `*_ids` | array | Ссылки на сущности блока, порядок — порядок отрисовки, см. §3.2 |

Ссылочные поля `*_ids` могут отсутствовать или быть пустыми. В отличие от прежнего описания, текущие секционные `audio_books` блоки содержали непустой `audio_book_ids` во всех 125 уникальных парах `(section.id, block.id)`; Rust-модель пока не декодирует это поле. Продолжение выдачи выполняется по `next_from` (§6.4).

### 3.2. Таксономия `data_type`

Ниже отмечено наблюдение в текущем наборе. Число в скобках — число
**уникальных пар `(section.id, block.id)`** среди 885 успешных ответов
`catalog.getSection`, а не число повторных появлений во всех методах. Исключение —
`search_suggestions`: единственный блок наблюдался в `catalog.getAudioSearch` и
не входит в этот подсчёт. Для полной матрицы `data_type × layout` и иной метрики см.
`docs/catalog-coverage.md` в dev-репозитории.

| `data_type` | Ссылочные поля | Текущие секционные наблюдения |
|---|---|---:|
| `music_audios` | `audios_ids` | ✓ (99) |
| `music_playlists` | `playlists_ids`, опц. `catalog_recom_playlist_relations` | ✓ (229) |
| `music_recommended_playlists` | `audios_ids` + `playlists_ids` | ✓ (2) |
| `music_owners` | `music_owners_ids` | ✓ (16) |
| `action` | — (только `actions`) | ✓ (58) |
| `none` | — (+ `badge`) | ✓ (530) |
| `empty` | — | ✓ (2) |
| `artist` | `artists_ids` + `artist_info` | ✓ (19) |
| `artist_videos` | `artist_videos_ids` | ✓ (25) |
| `audio_books` | `audio_book_ids` | ✓ (125); непустые ID в текущем срезе, Rust не декодирует |
| `audio_books_persons` | `audio_books_person_ids` | — |
| `audio_content_cards` | `audio_content_card_ids` | ✓ (3) |
| `audio_followings_update_info` | `audio_followings_update_info_ids` | — |
| `audio_stream_mixes` | `audio_stream_mixes_ids` | ✓ (2) |
| `catalog_banners` | `catalog_banner_ids` | ✓ (8) |
| `concerts` | `concerts_ids` | ✓ (6) |
| `curator` | `curators_ids` | ✓ (10); 14 appearances including block fetches |
| `groups_items` | `group_items` — массив объектов `{id, track_code}`, а не `*_ids` | ✓ (10) |
| `links` | `links_ids` | ✓ (115) |
| `longreads` | `longreads_ids` | — |
| `market_items` | `market_item_ids` | — в текущем наборе; наблюдался в предыдущей выборке |
| `placeholder` | `placeholder_ids` | ✓ (19) |
| `podcast_episodes` | `podcast_episodes_ids` | — в текущем наборе; наблюдался в предыдущей выборке |
| `podcast_slider_items` | `podcast_slider_items_ids` | — |
| `podcasts` | `podcast_items_ids` | ✓ (57) |
| `radiostations` | `radio_stations_ids` | ✓ (7) |
| `search_suggestions` | `suggestions_ids` | ✓ (1 в `catalog.getAudioSearch`, не в `getSection`) |
| `texts` | `text_ids` | ✓ (11) |
| `videos` | `videos_ids` | ✓ (3); отдельно от `artist_videos` |

Особые строки:
- `action` — блок кнопок (жанры, «показать всё», вкладки); сущностей у него нет;
- `none` — заголовки и разделители (`header_extended`, `separator`); `badge` может встречаться также у `action`;
- `empty` — явная заглушка пустого состояния;
- `music_recommended_playlists` — единственный тип с двумя ссылочными списками (`audios_ids` + `playlists_ids`).

---

## 4. Раскладка блока (`layout`)

```json
{
  "name": "list",
  "owner_id": 0,
  "title": "<layout-title>",
  "style": "<style>"
}
```

| Поле | Тип | Описание |
|---|---|---|
| `name` | string | Имя раскладки; у `empty` возможна пустая строка или отсутствие |
| `owner_id` | int | Контекст владельца; необязателен |
| `style` | string | Вариант оформления |
| `title` / `subtitle` | string | Тексты раскладки |
| `size`, `infinite_repeat`, `top_title` | зависит от поля | Дополнительные параметры, присутствие зависит от раскладки |

### 4.1. Таксономия раскладок

В текущих каталоговых блоках наблюдалось 37 именованных раскладок
(дополнительно встречаются блоки без имени):

`artist_header`, `audio_content_card_extended_slider`, `audio_stream_mix`,
`audio_stream_mix_interactive`, `banner`, `biography_layout`, `categories_grid`,
`categories_list`, `crop_slider`, `double_list`, `dynamic_grid`, `featured_list`,
`header`, `header_compact`, `header_extended`, `header_large`, `horizontal_buttons`,
`kids_catalog`, `kids_collection`, `large_slider`, `list`, `music_chart_large_slider`,
`music_chart_list`, `music_chart_triple_stacked_slider`, `owner_cell`, `placeholder`,
`placeholder_big`, `podcast_banners_slider`, `podcast_category_genre_buttons`,
`promo_banners_slider`, `recomms_slider`, `separator`, `slider`, `small_list`,
`subsection_tabs`, `text`, `triple_stacked_slider`.

`artist_merch_slider`, `double_stacked_list`, `listened_list`,
`playable_item_in_progress` и `small_banner_offer` были в предыдущей выборке,
но не встречались в текущей. Другие раскладки, известные по коду, но не
наблюдавшиеся в текущих захватах: `artists_slider`, `compact_list`, `entity_double_grid`,
`in_block_separator`, `large_list`, `link_snippet`, `music_exclusive_slider`,
`music_newsfeed_title`, `placeholder_small`, `podcasts_favorites`,
`snippets_banner`. `header`, `owner_cell` и `placeholder`, напротив, подтверждены
текущим набором.

Из наблюдавшихся раскладок `dynamic_grid`, `kids_catalog` и `kids_collection`
не имеют специализированного вида в Rust-фронтенде; неизвестную раскладку
нужно сохранять и обрабатывать мягко.

---

## 5. Кнопки блоков (`actions`)

Каждый элемент `actions[]` — объект с вложенным действием `action` и полями полезной нагрузки:

```json
{
  "action": { "type": "open_section", "style": "default" },
  "section_id": "<opaque-section-id>",
  "title": "<button-title>"
}
```

### 5.1. Типы действий

В текущем наборе встречены типы действий: `open_section`, `open_url`,
`play_vk_mix`, `play_audios_from_block`, `play_shuffled_audios_from_block`,
`toggle_artist_subscription`, `toggle_curator_subscription`, `music_follow_owner`,
`podcasts_subsection_tabs` и `switch_section`. `switch_section` наблюдался в 11
действиях; его назначение и ссылка могут различаться по странице. Другие типы,
известные по коду приложения, но не подтверждённые текущим срезом: `create_playlist`,
`edit_items`, `enter_edit_mode`, `reorder_items`, `select_sorting`, `playlists_lists`,
`owner_button`, `share`, `synth_clear_search_history`, `synth_custom_action`.


**Тип действия лежит во вложенном `action.type`**, на верхнем уровне элемента `actions[]` его нет — там только полезная нагрузка (`section_id`, `title`, …). Чтение `type` с верхнего уровня даёт `null` для всех кнопок.

### 5.2. Поля кнопок

| Поле | Описание |
|---|---|
| `section_id` | Opaque-ID целевой секции (`open_section`) |
| `block_id` | Блок-источник треков (`play_*_from_block`) |
| `mix_id` / `mix_options` | Микс и его опции (`play_vk_mix`) |
| `artist_id` / `entity_id` / `owner_id` | Цель подписки или действия |
| `title` / `description` / `text` | Тексты кнопки |
| `icon` / `images` / `foreground_images` | Графика кнопки |
| `options` | Вкладки подраздела: `{ "replacement_id": "#<section_id>/#<subsection_id>", "text": "Подкасты", "selected": 1 }`; выбранная вкладка помечается `selected: 1` и запроса не требует — её блоки уже на странице |
| `ref_data_type` / `ref_layout_name` / `ref_items_count` | Прототип содержимого кнопки (тип, раскладка и число элементов в целевой секции) — приложение рендерит кнопку миниатюрой будущей страницы |
| `click_event_type` | Имя события статистики клика |
| `hint_id` | Ссылка на подсказку из корневого массива `hints` (наблюдалась в текущем срезе) |
| `id` | Идентификатор кнопки |
| `is_following` | Состояние подписки (по приложению) |

---

## 6. Навигационные механизмы каталога

### 6.1. «Показать всё» (`meta.show_all_info`)

У разворачиваемых блоков `meta.show_all_info = { "section_id": "...", "title": "..." }`
есть адрес страницы блока; переход выполняется через `catalog.getSection`.
Текущий расчёт основан на 885 успешных ответах `catalog.getSection` и
дедуплицирует по `(section.id, block.id)`: `show_all_info` встретилось в 138
уникальных парах. В 41 случае целевой `section_id` отличался от родительского,
в 97 совпадал. Совпадение означает ссылку на текущую секцию, а не обязательно
рабочий переход на полный список. Блоки из одиночных ответов `block` в этот
расчёт не включены. Число элементов не позволяет надёжно отличить preview от
полного списка; сопоставление выполняется по самим opaque ID, а не по
демонстрационным значениям идентификаторов.

При наличии у блока и `show_all_info`, и кнопки действия переход определяется
контрактом приложения; `switch_section` встречается в текущих захватах и не
является достаточным основанием считать ссылку на `show_all_info` неверной.

### 6.2. Вкладки подразделов (`catalog.replaceBlocks`)

Блок с раскладкой `subsection_tabs` содержит кнопку `podcasts_subsection_tabs` со списком `options[]`. Выбранный вариант (`selected: 1`) соответствует текущей странице. Запрос к очередной вкладке — `catalog.replaceBlocks(replacement_ids="#<section_id>/#<subsection_id>")`; ответ: `replacements { new_next_from, replacements[{ from_block_ids, to_blocks }] }` + пакеты новых блоков. Клиент заменяет блоки с `from_block_ids` на `to_blocks`, сохраняя порядок.

### 6.3. Пагинация

Два уровня курсоров, оба opaque-строки:
- `section.next_from` → `catalog.getSection(section_id, start_from=<курсор>)` — следующая страница блоков;
- `block.next_from` → `catalog.getBlockItems(block_id, start_from=<курсор>)` — следующая порция элементов блока.

Продолжение есть, пока соответствующий `next_from` присутствует.

### 6.4. Ленивые карусели аудиокниг

Текущий набор опровергает прежнее правило о том, что секционные блоки `audio_books`
всегда без ID: в 125 уникальных парах `(section.id, block.id)` поле
`audio_book_ids` присутствует и непустое. При этом текущий `Block` и `CatalogPayload`
MusiMuX не декодируют сами книги и это поле. `catalog.getBlockItems` остаётся
механизмом продолжения там, где у блока есть `next_from`. `market_items` в текущем
срезе не встретился; его описание в старых снимках не следует считать текущим.

### 6.5. Адреса-псевдонимы

Одна страница достижима несколькими адресами: домены `vk.com`/`vk.ru`, формы `audios<UID>?section=X` и `audio?section=X`, секция по `section_id` и по `url`. Дедуплицировать такие адреса специально не нужно, но и считать их разными страницами не следует.

---

## 7. Пакеты сущностей и форматы идентификаторов

Ссылочные списки блоков содержат идентификаторы, а сами объекты — корневые пакеты конверта. Резолвер связывает их строго в порядке ссылок блока.

Форматы идентификаторов:
- **Композитные `owner_id_id`** — аудио (`audios_ids`), плейлисты (`playlists_ids`), мерч (`market_item_ids`). Те же сущности в пакете имеют числовые `id` + `owner_id`, поэтому резолвер индексирует обе формы (`id` и `{owner_id}_{id}`);
- **Числовые или объектные** — радиостанции, подкасты, контент-карты и т.п.;
- **Opaque-строки** — `links_ids`, `suggestions_ids`: шестнадцатеричные токены без структуры; совпадают со строковым `id` сущности;
- **Составные коды** — `audio_book_ids` и `podcast_items_ids` относятся к книгам/подкастам; `audio_book_ids` подтверждены текущими снимками, `podcast_items_ids` — формой схемы/базовым набором, но не текущей выборкой.

Ссылки на сущности других страниц не разрешаются внутри своего конверта — это норма: например, все `concerts_ids` блоков указывают на концерты, которые лежат только в конвертах артист-страниц.

---

## 8. Сущности каталога

Все объекты пакетов из конверта §1: состав полей, вариативность, связи с блоками. Типовой JSON каждой сущности — в [Приложении A](#приложение-a-типовые-json-объекты).

### 8.1. Аудиозапись (`Audio`, пакет `audios`)

Текущие wire-ответы содержат следующий набор полей (не все присутствуют в каждом объекте):

| Поля | Значение |
|---|---|
| `id`, `owner_id`, `artist`, `title`, `duration` | Идентификаторы и основные метаданные |
| `subtitle`, `performer` | Дополнительное имя/подпись; необязательные строки |
| `url` | Временный URL потока; может быть пустой строкой или отсутствовать |
| `access_key` | Ключ доступа для части объектов; не журналировать и не публиковать |
| `content_restricted` | Необязательный код ограничения; текущие наблюдения включают `1`, `2`, `3`, `5`, `7`, `10`, `24` |
| `album_id`, `album`, `release_audio_id` | Альбом и связь с исходным релизом |
| `main_artists`, `featured_artists` | Массивы исполнителей; отдельные объекты могут содержать больше полей, чем нужно карточке |
| `thumb`, `main_color` | Обложка и цвет |
| `date`, `genre_id`, `track_code` | Дата, жанр и аналитический код |
| `file_id`, `track_id`, `special_project_id` | Дополнительные идентификаторы; необязательны |
| `has_lyrics`, `is_licensed`, `is_official`, `is_explicit`, `is_focus_track`, `no_search` | Флаги записи; состав отличается по методу |
| `short_videos_allowed`, `stories_allowed`, `stories_cover_allowed` | Разрешения использования |
| `like`, `dislike` | Состояние медиатеки пользователя/оценки |
| `audio_chart_info` | Позиция/состояние в чарте |
| `legal_notices_type`, `flags_context`, `ads` | Дополнительная юридическая, контекстная или рекламная разметка |

**Граница модели MusiMuX.** Rust `Audio` разбирает основные поля, исполнителей,
альбом/обложку, URL, флаги и `audio_chart_info`. При этом `ArtistRef` сохраняет
только `id` и `name`; дополнительные поля объекта исполнителя не проходят в модель.
Wire-поля `content_restricted`,
`release_audio_id`, `main_color`, `is_official`, `file_id`, `track_id`,
`special_project_id`, `ads`, `legal_notices_type` и `flags_context` сейчас не
представлены в этой структуре и могут быть потеряны при декодировании. `is_hq`
и `lyrics_id` предусмотрены моделью, но в текущих снимках не наблюдались.

Поле `audio_streams` отсутствовало во всех успешных текущих ответах
`audio.getById`; оно также не встречалось в предыдущей выборке. Прежнее описание
типов `mp3`/`aac`/`flac` как наблюдённого контракта не подтверждается этими данными.
Это не означает, что VK не сможет добавить такое поле позднее.

### 8.2. Плейлист и альбом (`Playlist`, пакеты `playlists`, `albums`)

Объекты пакета `playlists` по слепку:

| Поле | Описание |
|---|---|
| `id` (< 0 у автоподборок), `owner_id`, `access_key` | Идентификаторы |
| `title`, `description`, `subtitle`, `subtitle_badge` | Тексты |
| `count`, `plays`, `followers` | Счётчики |
| `photo`, `thumbs`, `main_color` | Обложки и цвет |
| `genres` | Жанры подборки |
| `year` | Год (у релизов) |
| `type` | Вид (`ugc` и др.) |
| `is_explicit`, `is_following` | Флаги |
| `play_button` | Кнопка воспроизведения с трек-кодом |
| `permissions` | Права: `{ play, share, edit, delete, follow, boom_download, save_as_copy }` |
| `meta`, `album` | Вложенная классификация/вид отображения |
| `restriction`, `no_discover`, `original`, `followed` | Ограничения, видимость и связь с медиатекой |
| `audio_chart_info` | Динамика чарта у соответствующих альбомов |
| `main_artists`, `featured_artists`, `is_curator` | Артисты и флаг страницы |
| `track_code`, `flags_context` | Аналитический/контекстный код |
| `create_time`, `update_time`, `year` | Время и год |

Текущий Rust `catalog::Playlist` декодирует основные метаданные и обложку, но
wire-поля `album`, `featured_artists`, `is_curator`, `is_explicit`, `main_color`,
`subtitle_badge`, `track_code` и `flags_context` в этой модели не представлены.
Аудио-методы используют отдельную, более узкую `AudioAlbum` (§11.3). В одном
текущем каталожном ответе `albums` был пустым массивом; это не гарантирует, что
пакет всегда пуст.

#### Generated-плейлисты в каталоге

Карточки алгоритмических подборок находятся в обычном пакете `playlists` блока
`music_playlists`; это не тот же тип, что агрегатный пакет
`recommended_playlists` (§8.3). В захватах структурные признаки — `type:
"generated"`, отрицательный `id` и ссылки `playlists_ids` составного вида
`<owner_id>_<playlist_id>`. Конкретные ID, заголовки, числа элементов,
`access_key` и порядок карточек могут меняться и не являются постоянными
значениями контракта.

После открытия через `audio.getPlaylistById` счётчики, обложка и другие поля
могут отличаться от значений карточки каталога. При наличии `next_from` продолжение загружается через
`catalog.getBlockItems`; само наличие generated-объекта не гарантирует, что этот
блок бесконечный.

### 8.3. Рекомендованный плейлист (`recommended_playlists`)

В текущем пакете наблюдались `id`, `owner_id`, `audios`, `cover`, `color`,
`percentage` и `percentage_title`. `audios` — список ссылок на записи, а не
вложенные объекты `Audio`. `photo` в текущем пакете не наблюдалось.

Rust `RecommendedPlaylist` разбирает ID, `audios`, `cover`, `color` и
`percentage`; `percentage_title` в модели отсутствует. Этот агрегат отличается
от `music_playlists`/`playlists`.

### 8.4. Аудиокнига (`AudioBook`, пакет `audio_books`)

| Поле | Описание |
|---|---|
| `id`, `code`, `track_code` | Идентификаторы книги |
| `title`, `annotation` | Название и аннотация |
| `publisher`, `main_genre` | Объекты `{ id, name }` |
| `authors`, `narrators`, `translators` | Массивы персон `{ id, name, photo[] }`; у авторов/чтецов может быть `flags_context` |
| `genres` | Массив `{ id, name }` |
| `duration`, `file_size` | Длительность и размер книги |
| `cover` | Массив изображений `{ url, width, height }` |
| `access_status` | Статус доступа; наблюдались варианты `paid`, `free`, `started` |
| `chapters` | Массив глав с `id`, `title`, `audio_file: { duration, file_size, url }`, `progress_status`, `progress_time`, `track_code`; могут присутствовать `content_restricted` и `flags_context` |
| `progress_percentage` | Прогресс прослушивания |
| `minimum_age`, `is_explicit` | Возрастные ограничения |
| `has_illegal_mentions`, `illegal_mentions_text` | Отметки об упоминаниях |
| `in_favorites` | В избранном |
| `release_date`, `updated_at`, `copyright` | Даты и правообладатель |
| `restriction`, `flags_context` | Ограничения и контекстные флаги |

Текущие пакеты книг содержат `translators` и `illegal_mentions_text`.
Старый шаблон главы с `file.url` не соответствует текущей форме: URL входит в
`audio_file`.
Rust-модель каталожного блока MusiMuX пока не декодирует `audio_book_ids` и не
собирает `audio_books` в карточки. Персоны книг (`audio_books_persons`) в текущих
снимках не встретились; форма известна только по коду.

### 8.5. Подкаст (`podcasts`)

В текущем пакете наблюдались `id`, `owner_id`, `playlist_id`, `podcast_title`,
`subtitle`, `thumbs`, `can_subscribe`, `is_subscribed`, `permissions`,
`track_code` и `flags_context`. Связанный плейлист эпизодов — `playlist_id`.
Текущая `CatalogPayload` не декодирует пакет `podcasts` в Rust-модель.

### 8.6. Эпизод подкаста (`podcast_episodes`)

Схема из предыдущей выборки:
`{ id, owner_id, artist, title, duration, url, file_size, date, is_explicit,
is_focus_track, is_licensed, no_search, track_code, podcast_info }`. В текущих
снимках пакет `podcast_episodes` не наблюдался, поэтому доступность полей и
потока сейчас не подтверждена.

### 8.7. Радиостанция (`radio_stations`)

В текущем пакете: `id`, `name`, `logo_url`, `logo_png_url`, `stream_url`,
`background_color`, `is_enabled`, `is_followed` и `track_code`. Поток —
`stream_url`; наличие радиостанций в ответе не означает поддержки радио в
MusiMuX. Пакет сейчас не декодируется `CatalogPayload`.

### 8.8. Персональный микс (`audio_stream_mixes`)

В текущем пакете встречаются `id`, `title`, `description`, `titles`,
`background_animation_url`, `image_url`, `is_tunable`, `stream_mix` и `settings`.
`stream_mix` содержит `id`/`title`; `titles` — подписи состояний; `settings` —
объект с категориями и параметрами настройки. Порция треков запрашивается через
`audio.getStreamMixAudios(mix_id)`, настройки — через
`audio.getStreamMixSettings(mix_id)`; endpoint может вернуть `settings` или `[]`.

Rust `AudioStreamMix` сохраняет только часть карточки (`id`, `title`,
`is_tunable`, `button`, `images`); поля текущего wire-пакета `description`,
`image_url`, `background_animation_url`, `stream_mix`, `titles` и `settings`
не отражены в модели.

### 8.9. Контент-карта (`audio_content_cards`)

Текущие поля: `entity_id`, `entity_owner_id`, `entity_type`, `editor_tag`,
`editor_annotation`, `editor_background_image`, `editor_gradient_image`. Карта
ссылается на сущность через `entity_type`/ID. Пакет не декодируется текущей
`CatalogPayload`.

### 8.10. Промо-баннер (`catalog_banners`)

```json
{
  "id": 0,
  "title": "<banner-title>",
  "text": "<banner-text>",
  "subtext": "<banner-subtext>",
  "image_mode": "<image-mode>",
  "images": [ { "url": "<image-url>", "width": 0, "height": 0 } ],
  "buttons": [],
  "click_action": { "action": { "type": "<action-type>" } },
  "track_code": "<track-code>",
  "style": "<style>"
}
```

Rust `CatalogBanner` разбирает основные поля карточки; `style` из текущего wire-
пакета в модели отсутствует.

### 8.11. Плитка-ссылка (`links`)

Текущие поля: `id`, `title`, `subtitle`, `url`, `image`, `images`, `image_style`,
`background`, `analytic_name`, `meta`. `image` и `images` — массивы и могут
встречаться одновременно. `background` содержит вид/подтип, цвета, позиции и,
иногда, угол; `meta` может включать `content_type`, `track_code`, `icon`,
`is_explicit` и дополнительные сущности. `animation_url` сейчас не наблюдалось.
Ссылки могут вести на внутренние секции, страницы кураторов и владельцев.

Rust `Link` сохраняет только `id`, `title`, `subtitle`, `url`, `image` и часть
`meta`; дополнительные `images`, `image_style`, `background`, `analytic_name`
и поля `meta` не сохраняются.

### 8.12. Подсказка поиска (`suggestions`)

`{ id, title, subtitle, context }`. Поле `context` — opaque-токен подсказки;
текущий Rust-метод передаёт его параметром `context` следующему
`catalog.getAudioSearch`. Подмена этого значения на `requested_section_id`
требует отдельного подтверждения.

### 8.13. Заглушка (`placeholders`) и текст (`texts`)

- `placeholders`: `{ id, title, text, icons[], buttons[] }` — пустое состояние страницы; в текущем пакете встречаются и действия-кнопки;
- `texts`: `{ id, text, collapsed_lines }` — текстовый блок («Кураторы»), `collapsed_lines` — число строк в свёрнутом виде.

### 8.14. Концерт (`concerts`)

```json
{
  "concert_data": {
    "id": "<event-id>", "title": "<event-title>", "place_title": "<place>",
    "age_category": "<age-category>", "min_price": 0,
    "start_datetime": "<ISO-8601-datetime>",
    "city": { "id": 0, "title": "<city>" },
    "artists_ids": [], "image": [], "page_url": "<event-url>"
  },
  "purchase_action": {
    "action": { "type": "open_url", "target": "<target>", "url": "<purchase-url>" },
    "title": "<button-title>"
  },
  "track_code": "<opaque-track-code>"
}
```

### 8.15. Артист (`artists`) и `artist_info`

Объект `artists` может содержать `id`, `name`, `domain`, `bio`, `photo`,
`is_album_cover`, `is_followed` и `can_follow`. Набор зависит от ответа; формат
`photo`/варианты изображений не фиксированы. В массивах
`main_artists`/`featured_artists` у аудио встречаются дополнительные поля
профиля, например `bio`, `photos`, `genres`, `groups` и `profiles`; текущий
Rust `ArtistRef` сохраняет только `id` и `name`.

`artist_info` в блоке `artist` — **JSON-массив объектов**, а не JSON-строка.
В текущих блоках он разбирается Rust-типом `Vec<ArtistChips>`. Внутри чипа могут
быть `action`, `title`, `icon`, `mix_id`, `entity_id`, `track_code` и другие
поля; ID и коды непрозрачны и не должны копироваться между аккаунтами/сессиями.

### 8.16. Товар мерча (`market_items`)

Схема из предыдущей выборки включала поля `{ id, owner_id, title, description,
price, thumb, thumb_photo, market_url, availability, item_type, category,
cart_quantity, csrf_hashes, has_group_access, is_owner, is_adult, is_hardblocked }`.
В текущем наборе пакет `market_items` не встретился; текущая форма не подтверждена.
Поле `csrf_hashes`, если оно приходит, нельзя публиковать или переиспользовать.

### 8.17. Видео (`artist_videos` и `videos`)

Это отдельные пакеты/типы, оба присутствуют в текущем наборе. Общие поля
включают `id`, `owner_id`, `title`, `subtitle`, `description`, `duration`,
`date`, `type`, `image`, `first_frame`, `player`, `files`, `direct_url`, `views`,
`likes`, `reposts`, `comments`, `is_explicit` и флаги `can_*`.
`artist_videos` может дополнительно содержать `subtitles`, `timeline_thumbs`,
`width`, `height`, `release_date`, `trailer`, `viewed_duration` и
`tracking_info`. Состав зависит от endpoint; URLs/файлы эфемерны.

Текущий `CatalogPayload` не декодирует ни `videos`, ни `artist_videos`;
наличие пакетов не означает поддержку воспроизведения в MusiMuX.

### 8.18. Владелец (`music_owners`) и страница владельца

Запись владельца: `{ id, title, subtitle, url, image[] }`. В текущем наборе
встречается корневой пакет `music_owners` и блок `music_owners` с раскладкой
`owner_cell`; текущий Rust `MusicOwner` его декодирует.

- `id` — opaque-строка, не числовой `user_id`; её нельзя сопоставлять с
  числовыми ID в `profiles`/`groups`;
- поле изображений может называться `image` (ед. число); наличие аватара в
  пакетах `profiles`/`groups` не гарантируется;
- `section.url` у страницы владельца может отсутствовать; перед навигацией
  требуется проверка наличия этого поля;
- далее могут идти заглушка, действия, плейлисты и блоки аудио.

### 8.19. Куратор (`curators`)

В текущем пакете: `id`, `name`, `description`, `url`, `photo`, `is_followed`,
`can_follow`. Публичные данные объекта не заменяют opaque `track_code`, который
используется ссылкой для открытия страницы через `catalog.getAudioCurator`.
Текущая Rust-модель `Curator` разбирает эти поля.

### 8.20. Профиль (`profiles`)

Корневой пакет может содержать поля `id`, имя/фамилию, `screen_name`, аватары,
город/страну, `status`, `followers_count`, сведения об образовании/карьере,
состоянии приватности и присутствии в сети. Конкретная форма зависит от endpoint
и прав доступа; конкретные значения профиля из снимков в документацию не
включаются. Текущая Rust-модель `Profile` хранит только `id`, `first_name`, `last_name`,
`name`, `photo_base`, `photo_100` и `photo_200`; остальные wire-поля теряются.

### 8.21. Сообщество (`groups`)

Корневой пакет может содержать `id`, `name`, `screen_name`, `activity`, `city`,
`photo_base`, `members_count`, `type`, `is_closed`, `is_member` и другие флаги.
Значения зависят от ответа и владельца. Rust `Group` хранит только `id`, `name`
и массив `photo`; поле `photo_base` не маппится напрямую и может быть потеряно.

---

## 9. Метаданные блоков и события статистики

### 9.1. `listen_events`

События наблюдаются у секции и/или блока; текущий срез содержит больше вариантов,
чем в предыдущей выборке. Уникальные имена включают `music_owners_follow`,
`music_owners_unfollow`, `podcasts_subscribe`, `podcasts_unsubscribe`,
`audio_books_subscribe`, `audio_books_unsubscribe`, `artist_subscribe`,
`artist_unsubscribe`, `curator_subscribe`, `curator_unsubscribe`,
`radiostations_add`, `radiostations_remove`, `add`, `remove`, `links_add`,
`links_remove`, `music_audios_add`, `music_audios_remove`, `links_subscribe`,
`links_unsubscribe`, `audio_books_add` и `audio_books_remove`. Их наблюдение не
является рекомендацией отправлять событие без проверки контекста и требований VK.

### 9.2. `badge`

Бейдж блока имеет форму `{ "text": "<badge-text>", "type": "<badge-type>" }`.
Точный текст зависит от аккаунта и страницы и может меняться между снимками.

### 9.3. `meta`

- `show_all_info` — см. §6.1;
- `context` — контекст блока;
- `anchor` — якорь группового действия.

---

## 10. Размеры изображений и сетка обложек

Формы и размеры изображений различаются между `thumb`, `photo`, `images` и
`sizes[]`; размер определяется по фактическим `width`/`height`, а буквенный тип
не всегда позволяет его установить.

### 10.1. Именованные ключи

В текущих `thumb`/`photo` объектах наблюдались ключи `photo_34`, `photo_68`,
`photo_135`, `photo_270`, `photo_300`, `photo_600` и `photo_1200`. Значение
каждого ключа — URL; наличие каждого размера не гарантируется.

### 10.2. Массив `sizes[]`

```json
{
  "width": 0,
  "height": 0,
  "sizes": [
    { "type": "<size-type>", "width": 0, "height": 0, "src": "<image-url>" }
  ]
}
```

`type` и имя поля адреса (`src`/`url`) зависят от сущности. При выборе варианта
учитываются числовые `width` и `height`; пустые или отсутствующие URL
обрабатываются отдельно.

### 10.3. Баннеры и плитки ссылок

`catalog_banners.images` и `links.image` возвращают массивы вариантов изображений;
Соотношение сторон зависит от вида баннера или ссылки. Набор разрешений может
меняться; значения одной выборки не образуют фиксированный контракт.

---

## 11. Некаталожные ответы

### 11.1. Тексты песен (`audio.getLyrics`)

```json
{
  "credits": "<credits>",
  "md5": "<text-hash>",
  "lyrics": {
    "language": "<language>",
    "timestamps": [
      { "begin": 0, "end": 0, "line": "<lyric-line>" }
    ]
  }
}
```

Все шесть успешных ответов в текущей выборке содержали `lyrics.timestamps`;
поле `lyrics.text` в них не встретилось. Код клиента поддерживает `text` как
резервную форму, но не выдаёт её за текущую наблюдаемую схему. Ошибка `104`
означает, что текст для конкретного запроса недоступен.

### 11.2. Пользователь и профиль (`users.get`)

```json
{
  "id": 0,
  "first_name": "<first-name>",
  "last_name": "<last-name>",
  "screen_name": "<screen-name>",
  "photo_base": "<photo-url>",
  "photo_100": "<photo-url>",
  "photo_200": "<photo-url>",
  "verified": 0,
  "counters": { "audios": 0, "albums": 0, "clips_followers": 0 }
}
```

Числа, имена и ссылки в этом примере не являются данными какого-либо профиля.

### 11.3. Плейлист целиком (`audio.getPlaylistById`, `execute.getPlaylist`)

`audio.getPlaylistById` возвращает объект плейлиста. Текущие ответы содержат
метаданные вроде `genres`, `plays`, `followers`, `main_color`, `meta`,
`play_button`, `subtitle_badge`, `create_time`, `update_time` и `thumbs`; состав
зависит от плейлиста. Rust-модель `AudioAlbum` хранит `id`, `owner_id`,
заголовок/описание, тип, счётчик, ключ, права, связи медиатеки и обложки, но не
сохраняет перечисленные выше дополнительные поля. Треки не следует считать
частью этого ответа без проверки.

`audio.getPlaylists` возвращает `next_from`, но `AudioPlaylistPage` его сейчас не
сохраняет; обёртка использует `offset` для следующей страницы. Элементы списка
тоже декодируются как `AudioAlbum`, не как более полная `catalog::Playlist`;
например, wire-поля `genres`, `main_artists`, `main_color`, `is_explicit`,
`play_button` и `subtitle_badge` не входят в `AudioAlbum`.

`execute.getPlaylist` в текущих шести успешных снимках возвращал верхнеуровневый
`audios` и дополнительные `playlist`/`profiles`; `groups` не наблюдалось.
Клиентский код поддерживает `groups` и `items` как fallback, когда `audios` пуст.
Следующая порция запрашивается с помощью `audio_offset`; её размер определяется
фактическим ответом, а не вложенным preview.

### 11.4. Настройки микса (`audio.getStreamMixSettings`)

```json
{
  "settings": {
    "title": "<mix-title>",
    "mix_categories": [
      {
        "id": "<category-id>",
        "options": [
          { "id": "<option-id>", "title": "<option-title>", "selected": false }
        ]
      }
    ]
  }
}
```

Для части `mix_id` VK может вернуть пустой массив `[]`; допустимы обе формы.

### 11.5. Ограничение доступа (`audio.getRestrictionPopup`)

`{ "title": "<restriction-title>", "icons": [ { "url": "<image-url>", "width": 0, "height": 0 } ] }` — необязательное объяснение недоступности трека.

Параметр — одна запись строкой `owner_id_id`, при необходимости с ключом
доступа. Точный текст и изображения возвращает сервер; примеры не заменяют
значения ответа, а URL из ответов не включаются в документацию.

### 11.6. События плеера (`stats.trackEvents`)

Параметр `events` — JSON-массив; типичные ключи: `e`, `audio_id`, `uuid`,
`reason`, `start_time`, `playback_started_at`, `streaming_type`, `duration`,
`repeat`, `state`, `source`. Клиент генерирует уникальные значения `audio_id`,
`uuid` и времени для текущей сессии; такие значения не переносятся между сессиями.

```json
[
  {
    "e": "music_start_playback",
    "audio_id": "0_0",
    "uuid": 0,
    "reason": "<reason>",
    "start_time": 0,
    "playback_started_at": 0,
    "streaming_type": "online",
    "duration": 0,
    "repeat": "<repeat-mode>",
    "state": "app",
    "source": "<source>"
  }
]
```

Ответ — целое число `1`.

### 11.7. Серверы загрузки

`audio.getUploadServer` возвращает `{ "upload_url": "<temporary-upload-url>" }`.
Файл отправляется multipart; текущий upload-захват `audio.upload` возвращает
`{ "audio", "hash", "redirect", "server" }`, после чего `audio.save`
возвращает объект `Audio`.

Для обложки Rust-клиент запрашивает `photos.getAudioPlaylistCoverUploadServer`
и `audio.setPlaylistCoverPhoto` с `v=5.143`. Отдельный multipart-шаг
`photos.uploadPlaylistCover` в текущем наборе вернул `{ "photo", "hash" }`.
Эти параметры/URL одноразовые. Ответы нового upload-сервера с `sha`/`secret`
не подтверждены текущим методом загрузки обложки и не являются эквивалентом
`photo` без отдельного теста.

---

## 12. Сводная таблица методов и форм ответа

Формы ниже разделяют наблюдение текущего набора и поведение клиента. Ошибка
или отсутствие поля в ограниченной выборке не доказывает, что другой ответ
невозможен.

| Метод | Наблюдаемая/ожидаемая форма |
|---|---|
| `catalog.getAudio` | `catalog` с указателями; по URL состав секций и пакетов зависит от запроса |
| `catalog.getSection` | `section` + пакеты; `section.next_from` опционален |
| `catalog.getBlockItems` | `block` + пакеты; `block.next_from` опционален |
| `catalog.replaceBlocks` | `replacements` (`new_next_from`, `from_block_ids`, `to_blocks`) + пакеты |
| `catalog.getAudioSearch` | Без запроса — `catalog`/секция `search_suggestions`, `suggestions`, пустой `albums`; с запросом — `catalog` с указателями, в том числе `pinned_section` |
| `catalog.getAudioArtist` / `catalog.getAudioCurator` | `catalog.default_section`; страницу открывает `catalog.getSection` |
| `audio.get` | `{ count, items: [Audio], groups, profiles }`; `next_from` не наблюдался; Rust `AudioList` хранит только `count`/`items` |
| `audio.getById` | Массив `[Audio]`; `audio_streams` в текущем и baseline наборе не наблюдался |
| `audio.getCount` | Целое число |
| `audio.getPlaylists` | `{ count, items: [Playlist], profiles, groups, next_from }` в текущих захватах; Rust-модель сохраняет только `count` и `items` |
| `audio.getPlaylistById` | Объект плейлиста; текущая Rust-модель `AudioAlbum` сохраняет только часть полей |
| `audio.getLyrics` | В шести текущих успешных снимках — `lyrics.timestamps`; возможна ошибка `104`; Rust поддерживает `text` как fallback |
| `audio.getPopular` | Массив `[Audio]` |
| `audio.getRecommendations` | `{ count, items: [Audio] }`; `audios` не наблюдалось |
| `audio.search` | `{ count, items: [Audio] }` |
| `audio.getStreamMixSettings` | `{ settings: {...} }` либо `[]` |
| `audio.getStreamMixAudios` | Массив `[Audio]` |
| `audio.getRestrictionPopup` | `{ title, icons }` либо пустая структура |
| `audio.getUploadServer` | `{ upload_url }` |
| `audio.upload` (файловая загрузка) | `{ audio, hash, redirect, server }` |
| `audio.save` | Один объект `Audio` (не массив) |
| `photos.getAudioPlaylistCoverUploadServer` | `{ upload_url }` |
| `photos.uploadPlaylistCover` (файловая загрузка) | `{ photo, hash }` |
| `stats.trackEvents` | Целое число `1` |
| `execute.getPlaylist` | В шести текущих успешных ответах — верхнеуровневый `audios`, `playlist`, `profiles`; `groups` не наблюдалось, код поддерживает `items` fallback |
| `users.get` | Массив профилей `[User]` с опциональными `counters` |

Текущие манифесты содержат 48 методов; список и статус каждого
ответа не заменяют документацию параметров — см. §2.6 в [`API.md`](./API.md).

---

## 13. Write-методы (меняют аккаунт)

Таблица API-вызовов и изменений состояния находится в [`API.md`](./API.md).
Текущий набор подтверждает `audio.save`, `audio.removeFromPlaylist` и оба шага
файловой загрузки ниже; остальные примеры раздела основаны на коде/схеме и не
означают, что метод был вызван в текущем наборе.

### 13.1. `audio.add`

```json
{
  "errors": [],
  "errors_count": 0,
  "items": [
    {
      "audio_raw_id": "0_0",
      "new_audio_id": 0,
      "new_owner_id": 0
    }
  ],
  "items_count": 1
}
```

Числовые значения выше синтетические. Для дальнейшего удаления/восстановления
код использует ID, возвращённый самим VK, а не ID из исходного запроса.

### 13.2. `audio.removeFromPlaylist`

Текущий успешный захват возвращает числовое значение; параметры —
`owner_id`, `playlist_id`, `audio_ids`. Треки удаляются из плейлиста, но остаются
в медиатеке.

### 13.3. `audio.save`

После передачи файла серверу загрузки `audio.save` возвращает объект `Audio`.
Ответ может содержать временный URL и ключ доступа; они не являются постоянными
значениями и не должны сохраняться или публиковаться.

### 13.4. Загрузка файла и обложки

- аудио: `audio.getUploadServer` → multipart → `audio.upload` → `audio.save`;
- обложка: `photos.getAudioPlaylistCoverUploadServer` → multipart
  `photos.uploadPlaylistCover` → `audio.setPlaylistCoverPhoto`.

Одноразовые upload URL, `hash`, `photo`, `audio` и access-key следует брать из
свежего ответа, а не из документации или прежнего журнала.

---

## Приложение A. Синтетические JSON-шаблоны

Все значения в этом приложении вымышлены и иллюстрируют только форму полей.
Числовые ID равны нулю, строки в угловых скобках — места для свежих значений
из актуального ответа API. Публичные примеры содержат только синтетические
значения; реальные `access_key`, `device_id`, пользовательские идентификаторы, URL потоков,
профильные тексты и upload-хэши в них не включаются.

### A.1. Аудиозапись (`audios`)

```json
{
  "id": 0,
  "owner_id": 0,
  "artist": "<artist>",
  "title": "<track-title>",
  "duration": 0,
  "url": "<temporary-stream-url>",
  "access_key": "<access-key>",
  "date": 0,
  "file_id": "<file-id>",
  "is_licensed": false,
  "is_explicit": false,
  "has_lyrics": false,
  "main_color": "#000000",
  "release_audio_id": "0_0",
  "track_id": 0,
  "main_artists": [ { "id": "<artist-id>", "name": "<artist-name>" } ],
  "thumb": { "photo_300": "<image-url>" },
  "album": { "id": 0, "owner_id": 0, "title": "<album-title>" }
}
```

`audio_streams` в текущих или baseline ответах `audio.getById` не обнаружено.

### A.2. Плейлист (`playlists`)

```json
{
  "id": -1,
  "owner_id": 0,
  "title": "<playlist-title>",
  "subtitle": "<subtitle>",
  "type": "generated",
  "count": 0,
  "access_key": "<access-key>",
  "is_following": false,
  "photo": { "id": "<photo-id>", "width": 0, "height": 0 },
  "permissions": { "play": true, "share": false, "edit": false, "delete": false }
}
```

### A.3. Рекомендованный плейлист (`recommended_playlists`)

```json
{
  "id": 0,
  "owner_id": 0,
  "audios": [ "0_0" ],
  "cover": "<cover-url>",
  "color": "#000000",
  "percentage": "<percentage>",
  "percentage_title": "<match-label>"
}
```

### A.4. Аудиокнига (`audio_books`)

```json
{
  "id": 0,
  "code": "<book-code>",
  "title": "<book-title>",
  "annotation": "<annotation>",
  "access_status": "free",
  "duration": 0,
  "file_size": 0,
  "progress_percentage": 0,
  "minimum_age": 0,
  "is_explicit": false,
  "in_favorites": false,
  "has_illegal_mentions": false,
  "flags_context": 0,
  "publisher": { "id": 0, "name": "<publisher>" },
  "authors": [ { "id": 0, "name": "<author>", "photo": [] } ],
  "narrators": [],
  "translators": [],
  "genres": [ { "id": 0, "name": "<genre>" } ],
  "cover": [ { "url": "<image-url>", "width": 0, "height": 0 } ],
  "chapters": [
    {
      "id": "<chapter-id>",
      "title": "<chapter-title>",
      "audio_file": { "duration": 0, "file_size": 0, "url": "<temporary-audio-url>" },
      "progress_status": "<progress-status>",
      "progress_time": 0,
      "track_code": "<track-code>"
    }
  ]
}
```

### A.5. Подкаст (`podcasts`)

```json
{
  "id": 0,
  "playlist_id": 0,
  "owner_id": 0,
  "podcast_title": "<podcast-title>",
  "subtitle": "<subtitle>",
  "can_subscribe": false,
  "is_subscribed": false,
  "permissions": { "play": false },
  "thumbs": [ { "width": 0, "height": 0, "sizes": [] } ],
  "track_code": "<track-code>",
  "flags_context": 0
}
```

### A.6. Эпизод подкаста (`podcast_episodes`, baseline only)

```json
{
  "id": 0,
  "owner_id": 0,
  "artist": "<publisher>",
  "title": "<episode-title>",
  "duration": 0,
  "url": "<temporary-stream-url>",
  "file_size": 0,
  "date": 0,
  "track_code": "<track-code>",
  "podcast_info": {
    "description": "<description>",
    "is_favorite": false,
    "is_listened": false,
    "is_new": false,
    "position": 0
  }
}
```

Пакет `podcast_episodes` не встретился в текущем наборе; пример — схема,
отмеченная в предыдущей выборке, а не подтверждение текущего ответа.

### A.7. Радиостанция (`radio_stations`)

```json
{
  "id": 0,
  "name": "<station-name>",
  "stream_url": "<stream-url>",
  "logo_url": "<image-url>",
  "logo_png_url": "<image-url>",
  "background_color": "#000000",
  "is_enabled": false,
  "is_followed": false,
  "track_code": "<track-code>"
}
```

### A.8. Персональный микс (`audio_stream_mixes`)

```json
{
  "id": "<mix-id>",
  "title": "<mix-title>",
  "description": "<description>",
  "is_tunable": false,
  "image_url": "<image-url>",
  "background_animation_url": "<animation-url>",
  "stream_mix": { "id": "<mix-id>", "title": "<mix-title>" },
  "titles": { "common_state": "<title>", "play_state": "<title>" },
  "settings": { "title": "<settings-title>", "subtitle": "<subtitle>", "mix_categories": [] }
}
```

### A.9. Контент-карта (`audio_content_cards`)

```json
{
  "entity_type": "<entity-type>",
  "entity_id": "<entity-id>",
  "entity_owner_id": "<owner-id>",
  "editor_tag": "<tag>",
  "editor_annotation": "<annotation>",
  "editor_background_image": [],
  "editor_gradient_image": []
}
```

### A.10. Плитка-ссылка (`links`)

```json
{
  "id": "<opaque-link-id>",
  "title": "<link-title>",
  "subtitle": "<subtitle>",
  "url": "<destination-url>",
  "analytic_name": "<analytic-name>",
  "image_style": "<image-style>",
  "image": [ { "url": "<image-url>", "width": 0, "height": 0 } ],
  "images": [],
  "background": { "type": "<background-type>", "colors": [], "positions": [] },
  "meta": { "content_type": "<content-type>", "track_code": "<track-code>" }
}
```

### A.11. Подсказка поиска (`suggestions`)

```json
{
  "id": "<opaque-suggestion-id>",
  "title": "<query-title>",
  "subtitle": "<subtitle>",
  "context": "<opaque-context-token>"
}
```

### A.12. Заглушка (`placeholders`) и текст (`texts`)

```json
{
  "id": "<opaque-id>",
  "title": "<placeholder-title>",
  "text": "<placeholder-text>",
  "icons": [],
  "buttons": []
}
```
```json
{
  "id": "<opaque-id>",
  "text": "<description>",
  "collapsed_lines": 0
}
```

### A.13. Товар мерча (`market_items`, baseline only)

```json
{
  "id": 0,
  "owner_id": 0,
  "title": "<item-title>",
  "description": "<description>",
  "market_url": "<market-url>",
  "price": { "amount": "0", "currency": { "id": 0, "name": "<currency>", "title": "<symbol>" } },
  "thumb": "<image-url>",
  "thumb_photo": [],
  "availability": 0,
  "item_type": 0,
  "csrf_hashes": "<one-time-value>"
}
```

Пакет `market_items` отсутствует в текущей выборке; поля этого шаблона не
подтверждены текущими ответами.

### A.14. Владелец и видео

```json
{ "id": "<opaque-owner-id>", "title": "<title>", "subtitle": "<subtitle>", "url": "<profile-url>", "image": [] }
```
```json
{ "id": 0, "owner_id": 0, "title": "<video-title>", "duration": 0, "image": [], "files": {} }
```

### A.15. Куратор

```json
{
  "id": 0,
  "name": "<curator-name>",
  "description": "<description>",
  "url": "<page-url>",
  "photo": [],
  "is_followed": false,
  "can_follow": false
}
```

### A.16. Профиль и сообщество (корневые пакеты)

```json
{ "id": 0, "first_name": "<first-name>", "last_name": "<last-name>", "photo_base": "<photo-url>" }
```
```json
{ "id": 0, "name": "<group-name>", "screen_name": "<screen-name>", "photo_base": "<photo-url>" }
```

## Приложение B. Покрытие типов и пакетов

### Пакеты, присутствующие в текущей выборке

| Пакет / тип | Текущее наблюдение | Граница Rust-модели |
|---|---|---|
| `audios` | Объекты в каталожных и аудио-ответах | `Audio` разбирает основную схему; часть wire-полей теряется (§8.1) |
| `playlists` | Объекты и ссылки в блоках | `Playlist` разбирает основные метаданные; дополнительные поля перечислены в §8.2 |
| `recommended_playlists` | Объекты агрегата | `RecommendedPlaylist` частичный; `percentage_title` не сохраняется (§8.3) |
| `links` | Ссылки разных раскладок | `Link` сохраняет только часть полей (§8.11) |
| `artists` / `artist` | Пакет и блоки артистов | `Artist`/`ArtistRef` есть; `ArtistRef` хранит только `id`/`name` (§8.15) |
| `curators` / `curator` | 14 объектов; 10 уникальных пар блоков в `getSection` | Модель `Curator` есть (§8.19) |
| `music_owners` | 19 объектов; `owner_cell` наблюдался в секциях | Модель `MusicOwner` есть (§8.18) |
| `catalog_banners` | Объекты с `images`, `buttons`, `click_action` и другими полями | `CatalogBanner` частичный: `style` не сохраняется (§8.10) |
| `audio_books` | 125 уникальных пар секционных блоков имеют непустые `audio_book_ids` | Нет полной модели/резолвера в `CatalogPayload` (§8.4) |
| `audio_stream_mixes` | Карточки, включая вложенные `settings` | Rust-модель сохраняет только часть карточки (§8.8) |
| `audio_content_cards` | Редакционные карточки | Пакет не декодируется (§8.9) |
| `podcasts` | Карточки подкастов | Пакет не декодируется (§8.5) |
| `radio_stations` | Объекты со `stream_url` | Пакет не декодируется (§8.7) |
| `concerts` | Объекты с `concert_data` и `purchase_action` | Пакет не декодируется (§8.14) |
| `artist_videos`, `videos` | Два разных пакета; в каталоге встречаются `videos/list` и `videos/slider` | Пакеты не декодируются; наличие не означает поддержку воспроизведения (§8.17) |
| `suggestions`, `texts`, `placeholders` | Поисковые подсказки, тексты и пустые состояния | Модели есть; состав опциональных полей различается |
| `profiles`, `groups` | Корневые объекты владельцев и связанные профили | Модели есть, но сохраняют только небольшой набор полей (§8.20–8.21) |
| `albums` | Один наблюдавшийся пакет — пустой массив | Объекты в текущем захвате отсутствуют; это не означает, что тип всегда пуст |

### Были в предыдущей выборке, но не встретились сейчас

`market_items`, `podcast_episodes`, раскладки `artist_merch_slider`,
`double_stacked_list`, `listened_list`, `playable_item_in_progress`,
`small_banner_offer`. В baseline присутствовали шесть конкретных пар:
`audio_books × listened_list`, `links × small_banner_offer`,
`market_items × artist_merch_slider`, `market_items × double_stacked_list`,
`podcast_episodes × listened_list` и
`podcast_episodes × playable_item_in_progress`. Их отсутствие сейчас — различие
покрытия, не доказательство удаления соответствующих endpoint/полей VK.

### Известны по коду/сравнительному справочнику, но не наблюдались

| Пакет / `data_type` | Структурная заметка |
|---|---|
| `audio_books_persons` | Персоны книг; ожидаемая форма `{ id, name, photo, description, roles[] }` |
| `longreads` | Лонгриды каталога |
| `podcast_slider_items` | Элементы слайдера подкастов |
| `audio_followings_update_info` | Информация об обновлениях подписок |
| `future_releases` | Не встречались в текущих захватах; фильтр кода содержит префикс `future_release` |

Неизвестные поля, пакеты и значения ID должны обрабатываться мягко. Точные
параметры вызовов и разделение источников описаны в [`API.md`](./API.md).
