# Gemini HTML Builder - Chrome Extension

> **⚠️ CHÚ Ý: EXTENSION ĐANG TRONG QUÁ TRÌNH PHÁT TRIỂN**
> 
> Extension hiện tại **CHƯA SẴN SÀNG SỬ DỤNG** và **CHƯA HOẠT ĐỘNG ĐẦY ĐỦ**. Đây là phiên bản đang phát triển và chưa được kiểm thử hoàn chỉnh. Vui lòng **KHÔNG CÀI ĐẶT** để sử dụng cho mục đích thực tế.
>
> Dự án này đang được xây dựng và cần thêm thời gian để hoàn thiện.

## Mô tả
Extension Chrome cho phép bạn sử dụng Gemini AI để tạo mã HTML và xem preview trực tiếp. Extension inject script vào trang Gemini để gọi API trực tiếp với session của bạn.

## Tính năng
- 🤖 Inject script vào Gemini để gọi API trực tiếp
- 👁️ Preview HTML ngay trong extension
- 💾 Lưu lịch sử vào IndexedDB
- 📥 Tải xuống file HTML
- 📋 Copy HTML vào clipboard
- 🔗 Mở preview trong tab mới

## Cấu trúc

```
extension-build-ui/
├── manifest.json      # Config extension (Manifest V3)
├── background.js      # Service worker - điều phối messages
├── content.js         # Content script - chạy trên gemini.google.com
├── injected.js        # Injected script - gọi API trong page context
├── options.html       # Giao diện chính
├── options.js         # Logic cho options page
├── options.css        # Styles cho options page
├── db.js              # IndexedDB manager
└── README.md
```

## Cài đặt

### 1. Load extension vào Chrome
1. Mở Chrome và truy cập `chrome://extensions/`
2. Bật **Developer mode** (góc phải trên)
3. Click **Load unpacked**
4. Chọn thư mục `extension-build-ui`

### 2. Sử dụng

1. **Click icon extension** trên toolbar → Mở trang Options (giao diện chính)
2. **Click "Mở Gemini"** để mở tab Gemini và kết nối
3. Khi thấy trạng thái **"Đã kết nối"**, nhập prompt mô tả HTML
4. **Click "Tạo HTML"** và chờ kết quả
5. Xem preview bên trái, tải xuống hoặc copy HTML

## Cách hoạt động

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Options Page  │ ←──→ │  Background.js  │ ←──→ │  Content Script │
│   (Giao diện)   │      │  (Service Worker)│     │  (gemini.google)│
└─────────────────┘      └─────────────────┘      └────────┬────────┘
                                                           │
                                                           ↓
                                                  ┌─────────────────┐
                                                  │  Injected.js    │
                                                  │  (Page Context) │
                                                  │  - Gọi API      │
                                                  │  - Có cookies   │
                                                  └─────────────────┘
```

1. **Options Page**: Giao diện người dùng, gửi prompt đến Background
2. **Background Script**: Điều phối messages giữa Options và Content Script
3. **Content Script**: Chạy trên trang Gemini, inject script vào page
4. **Injected Script**: Chạy trong context của trang, gọi API với cookies có sẵn

## Giao diện

```
┌─────────────────────────────────────────────────────────────────┐
│  ✨ Gemini HTML Builder                    [● Đã kết nối]       │
├─────────────────────────────────────────────────────────────────┤
│                           │  🔌 Kết nối Gemini                  │
│  📱 Preview               │  [✅ Đã kết nối Gemini]             │
│  [🔄] [🔗] [💾] [📋]      │                                     │
│  ┌──────────────────┐    │  📜 Lịch sử                    [🗑️] │
│  │                  │    │  ├─ Landing page cà phê        │
│  │   [Preview       │    │  ├─ Portfolio developer        │
│  │    HTML được     │    │  └─ Dashboard admin            │
│  │    tạo ở đây]    │    │                                     │
│  │                  │    │  💬 Mô tả HTML                       │
│  │                  │    │  ┌─────────────────────────────┐    │
│  │                  │    │  │ Tạo landing page...         │    │
│  └──────────────────┘    │  └─────────────────────────────┘    │
│                           │  [🚀 Tạo HTML]                      │
└─────────────────────────────────────────────────────────────────┘
```

## Lưu ý

- Cần đăng nhập vào Gemini trên cùng trình duyệt
- Giữ tab Gemini mở để duy trì kết nối
- Prompt đã được tối ưu để Gemini trả về HTML thuần túy
- Nếu mất kết nối, click "Mở Gemini" để kết nối lại
