# ✨ Gemini HTML Builder — Chrome Extension

Chrome Extension tạo HTML/UI từ Gemini AI với preview trực tiếp, inspect & chỉnh sửa phần tử, quản lý đa page và lịch sử phiên bản.

## Tính năng

### 🤖 Tạo HTML bằng AI
- Mô tả UI bằng ngôn ngữ tự nhiên (tiếng Việt), Gemini sinh HTML hoàn chỉnh (single-file, inline CSS)
- **Hai chế độ AI**: ⚡ Nhanh (Flash) và 🧠 Tư duy (Thinking) — chuyển đổi bằng toggle switch
- **Chỉnh sửa lặp lại** — prompt tiếp theo tự động bao gồm HTML hiện tại, AI chỉ thay đổi phần được yêu cầu mà bảo toàn toàn bộ CSS/cấu trúc

### 🎯 Inspect & Chỉnh sửa phần tử
- Bật chế độ **Inspect** → di chuột để highlight phần tử → click để chọn
- Mô tả thay đổi cho phần tử đã chọn → AI chỉ sửa innerHTML của phần tử đó mà không ảnh hưởng phần còn lại
- Hiển thị CSS selector của phần tử đang được chỉnh sửa

### 📱 Device Preview
- Xem trước ở 3 kích thước: **Desktop** (100%), **Tablet** (768px), **Mobile** (375px)
- Chuyển đổi nhanh bằng toolbar trên preview

### 📄 Quản lý đa Page
- Tạo, đổi tên (double-click), xóa nhiều page
- Mỗi page là một workspace độc lập với conversation context riêng (conversationId/responseId/choiceId)
- Prompt tiếp theo trên cùng page tiếp tục ngữ cảnh hội thoại trước đó

### 📜 Lịch sử & Revert
- Mỗi lần tạo/chỉnh sửa được lưu thành một mục lịch sử (prompt + full HTML)
- Click vào mục lịch sử bất kỳ để xem lại phiên bản đó
- **Revert** — click vào phiên bản cũ, prompt tiếp theo sẽ tiếp tục từ phiên bản đã revert

### 🛠️ Các thao tác khác
- 🔄 Refresh preview
- 🔗 Mở preview trong tab mới
- 📥 Tải xuống file HTML
- 📋 Copy HTML vào clipboard
- 🔒 Khóa UI khi đang tạo (click khi đang tạo sẽ hiện hiệu ứng shake-reject)
- 🔌 Tự động kết nối / tái kết nối Gemini

## Cài đặt

1. Mở Chrome → truy cập `chrome://extensions/`
2. Bật **Developer mode** (góc phải trên)
3. Click **Load unpacked** → chọn thư mục `extension-ui-builder`
4. Click icon extension trên toolbar để mở giao diện

## Sử dụng

1. **Mở trang Gemini** — Extension tự động mở tab `gemini.google.com` và kết nối khi cần
2. **Chờ kết nối** — Đèn trạng thái chuyển xanh "Đã kết nối"
3. **Nhập prompt** — Mô tả HTML/UI bạn muốn tạo
4. **Chọn model** — ⚡ Nhanh (mặc định) hoặc 🧠 Tư duy
5. **Nhấn "Tạo HTML"** — Chờ AI trả kết quả, preview hiển thị bên trái
6. **Chỉnh sửa** — Nhập prompt tiếp theo để sửa đổi, hoặc dùng Inspect để sửa từng phần tử

## Kiến trúc

```
Options Page ←──chrome.runtime──→ Background (SW) ←──chrome.tabs──→ Content Script ←──postMessage──→ Injected Script
 (Giao diện)                     (Điều phối)                       (gemini.google.com)               (Page Context)
```

| Thành phần | Vai trò |
|---|---|
| **options.js** | Giao diện chính — quản lý page, history, prompt, preview, inspect mode, device toolbar |
| **background.js** | Service worker — điều phối message giữa options và content script, quản lý tab Gemini, tự động kết nối |
| **content.js** | Chạy trên gemini.google.com — cầu nối giữa chrome.runtime và window.postMessage, inject script |
| **injected.js** | Chạy trong page context của Gemini — trích xuất token xác thực, gọi API StreamGenerate, parse streaming response |
| **db.js** | IndexedDB wrapper — lưu trữ pages và lịch sử HTML |

### Luồng tạo HTML

```
1. User nhập prompt → options.js
2. options.js xây dựng prompt (new / modification / element-edit) → GENERATE_HTML → background.js
3. background.js tìm/mở tab Gemini → GENERATE_REQUEST → content.js
4. content.js → postMessage → injected.js
5. injected.js:
   - Trích xuất token (SNlM0e, FdrFJe, bl) từ DOM
   - Gọi POST /_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate
   - Parse streaming response (chunked wrb.fr JSON)
   - Trích xuất HTML từ token array hoặc text field
   - Trích xuất conversationId / responseId / choiceId
6. Kết quả chảy ngược: injected.js → content.js → background.js → options.js
7. options.js hiển thị preview, lưu IndexedDB, cập nhật history
```

### Xử lý prompt thông minh

| Tình huống | Cách xử lý |
|---|---|
| **Page trống** | Bọc prompt với hướng dẫn tạo HTML thuần (single-file, inline CSS, responsive, không dùng ảnh) |
| **Có HTML + sửa đổi** | Gửi kèm toàn bộ HTML hiện tại + yêu cầu sửa + luật bảo toàn CSS/cấu trúc |
| **Chỉnh sửa phần tử** | Gửi outerHTML của phần tử + yêu cầu → AI trả innerHTML mới |
| **Revert** | Đánh dấu trạng thái revert, prompt tiếp theo bao gồm note cho AI biết đã revert |

## Cấu trúc thư mục

```
extension-ui-builder/
├── manifest.json       # Chrome Extension manifest v3
├── background.js       # Service worker — điều phối messages
├── content.js          # Content script — chạy trên gemini.google.com
├── injected.js         # Injected script — gọi Gemini API trong page context
├── options.html        # Giao diện chính (two-panel layout)
├── options.js          # Logic giao diện — page, history, prompt, preview, inspect
├── options.css         # Dark theme stylesheet
├── db.js               # IndexedDB manager (pages + htmlHistory)
├── icons.js            # SVG icon library
├── gemini-api.js       # Alternative API handler (legacy)
├── styles.css          # Alternative stylesheet (legacy)
├── icons/              # Extension icon PNGs (16, 48, 128)
└── README.md
```

## Database (IndexedDB)

**Database:** `GeminiHTMLBuilder` (version 2)

### Bảng `pages`
| Field | Mô tả |
|---|---|
| `id` | Auto-increment primary key |
| `name` | Tên page (vd: "Page 1") |
| `createdAt` | Timestamp tạo |
| `conversationId` | Gemini conversation ID (per-page) |
| `responseId` | Gemini response ID |
| `choiceId` | Gemini choice ID |
| `lastHtml` | HTML mới nhất |
| `lastPrompt` | Prompt mới nhất |

### Bảng `htmlHistory`
| Field | Mô tả |
|---|---|
| `id` | Auto-increment primary key |
| `pageId` | Foreign key → pages.id |
| `prompt` | Prompt đã dùng |
| `html` | Full HTML content |
| `timestamp` | Timestamp |
| `date` | Formatted date string (vi-VN) |

## Giao diện

![Screenshot 1](screenshot/1.png)

![Screenshot 2](screenshot/2.png)

![Screenshot 3](screenshot/3.png)

## Lưu ý

- Cần **đăng nhập vào Gemini** trên cùng trình duyệt Chrome
- Extension sẽ tự mở tab Gemini khi cần — **giữ tab Gemini mở** để duy trì kết nối
- Nếu mất kết nối, extension sẽ tự kết nối lại khi nhấn "Tạo HTML"
- Mỗi page có conversation context riêng — prompt tiếp theo sẽ hiểu ngữ cảnh trước đó
- HTML được tạo là **single-file** (inline CSS, không external dependencies) để dễ tải xuống và sử dụng

## Theme

Dark theme với bảng màu:

| Vai trò | Giá trị |
|---|---|
| Nền chính | `#0a0a0f` → `#12121a` → `#1a1a25` |
| Accent chính | `#00ff88` (neon green) |
| Accent phụ | `#00b4d8` (cyan) |
| Danger | `#ff4757` (red) |
| Text | `#ffffff` / `#a0a0b0` |
