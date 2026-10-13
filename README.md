# 🎲 TÀI XỈU VIP - REALTIME MULTIPLAYER CASINO WEB GAME

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-lightgrey.svg)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)
[![Vanilla CSS & JS](https://img.shields.io/badge/Frontend-Vanilla_JS_%26_CSS3-gold.svg)](https://developer.mozilla.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Tài Xỉu VIP** là nền tảng trò chơi Tài Xỉu trực tuyến nhiều người chơi thời gian thực, mô phỏng chân thực sòng bài Macau / Las Vegas đẳng cấp quốc tế. Dự án kết hợp công nghệ WebSocket hai chiều, hiệu ứng vật lý lắc bát đĩa 3D sống động, tính năng **Nặn Bát 360 Độ** độc quyền và hệ thống **Admin God Mode** toàn quyền kiểm soát sòng cược.

---

## 🌟 TÍNH NĂNG NỔI BẬT

### 🎮 Phía Người Chơi (Player Portal - `game.html`)
1. **Giao Diện Hoàng Kim VIP (Luxury Gold Casino Aesthetic):**
   - Thiết kế chuẩn Casino hiện đại với hiệu ứng Glassmorphism, ánh kim loại, viền vàng phát quang và hoạt ảnh micro-animation mượt mà.
   - Thích ứng hoàn hảo trên mọi kích thước màn hình (Desktop, Tablet, Mobile).
2. **Cơ Chế Bát Đĩa Vật Lý & Lắc Lên Xuống Chân Thực:**
   - Khi lắc xúc xắc, cái bát nhấc lên dội xuống (-34px tới +5px) theo chu kỳ va chạm đàn hồi (squash & stretch) kèm hiệu ứng đĩa rung và xúc xắc đảo bên trong.
   - Âm thanh Web Audio tổng hợp chân thực (tiếng xóc xí ngầu, chuông báo phiên, chip cược, âm thanh ăn tiền ting ting).
3. **Cơ Chế Nặn Bát 360° Độc Quyền (Interactive 360° Peeking):**
   - Người chơi được nhấp giữ và kéo chiếc bát tự do theo mọi hướng (Pointer Capture) để hé mở dần dần từng chấm của 3 viên xí ngầu đỏ trong 15 giây.
   - Có tùy chọn mở nhanh "MỞ BÁT NGAY" tiện lợi.
4. **Hệ Thống Đặt Cược & Chip Cược Thông Minh:**
   - Cửa cược: **TÀI** (11 - 17 điểm), **XỈU** (4 - 10 điểm), **BÃO** (3 mặt đồng số).
   - Tỷ lệ cược chuẩn quốc tế: 1 ăn 0.7 (hoàn gốc 1 + thưởng 0.7 = 1.7x).
   - Chip cược đa mệnh giá: 50K, 100K, 500K, 1M, 5M, 10M kèm phím tắt nhanh (+100K, +500K, +1M, +5M, +10M, Gấp đôi x2, Tất tay All-in).
5. **Soi Cầu Đỉnh Cao (Roadmap Analytics):**
   - **Cầu Giọt Nước (Bead Road):** Ma trận hạt tròn Tài/Xỉu trực quan lịch sử 30 phiên.
   - **Biểu Đồ Tọa Độ 3 Xí Ngầu (Canvas Chart):** Đồ thị đường đi điểm số của từng viên xúc xắc theo thời gian thực.
   - **Thống Kê Tỷ Lệ:** Tỉ lệ % Tài vs Xỉu, chuỗi cầu bệt, cầu nhảy 1-1, 1-2-3,...
6. **Chat Thế Giới Trực Tuyến & Bot Đám Đông Sôi Nổi:**
   - Hệ thống phát sóng tin nhắn thời gian thực giữa những người chơi thật qua WebSocket.
   - Hơn **80+ danh tính Bot** đa dạng phong cách dân cược Việt Nam với tốc độ bắn tin nhắn nhanh (0.9s - 2.2s/tin, chuỗi burst 300ms) cổ vũ theo đúng diễn biến trận đấu.
   - Thả biểu cảm cảm xúc (Emoji Burst) bay lượn trên màn hình.

---

### 👑 Phía Quản Trị Viên (Admin God Mode - `admin.html`)
1. **Bảng Theo Dõi Thời Gian Thực (Live Metrics Dashboard):**
   - Đếm ngược từng giây theo pha: Đặt cược (60s) ➔ Lắc bát (5s) ➔ Nặn kết quả (15s).
   - Thống kê doanh số cược cửa Tài vs cửa Xỉu, số lượng vé cược, ước tính chênh lệch lợi nhuận nhà cái.
   - Lọc danh sách cược: Tất cả, Người chơi thật, Bot tự động.
2. **Cấu Hình Tỉ Lệ Thắng Thua (House Edge Controller):**
   - Kéo thanh trượt điều chỉnh tỉ lệ người chơi thắng từ **0% đến 100%**.
   - Các mức cài đặt nhanh 1-click:
     - 🩸 **Hút Máu (15%)**
     - ⚠️ **Khó Ăn (30%)**
     - ⚖️ **Cân Bằng (50%)**
     - 🎁 **Nhả Tiền (75%)**
     - 👑 **Thắng 100%**
   - Tỉ lệ được lưu trữ bền vững (Persistent) vào Database, không bị mất khi khởi động lại server.
3. **Ép Kết Quả Trực Tiếp (God Mode 1 Phiên):**
   - Ép kết quả phiên kế tiếp thành **TÀI**, **XỈU**, hoặc **BÃO**.
   - Tùy chọn gắp chính xác điểm số từng viên: `[Xúc xắc 1, Xúc xắc 2, Xúc xắc 3]`.
4. **Hệ Thống Quản Lý Bot Đặt Cược Tự Động:**
   - Bật / Tắt bot cược tự động.
   - Điều chỉnh mật độ bot tham gia bàn: Thưa thớt (5-10 bot), Vừa phải (12-25 bot), Sôi động (25-45 bot).
5. **Quản Lý Tài Khoản & Số Dư:**
   - Xem toàn bộ danh sách tài khoản đã đăng ký.
   - Thao tác nhanh: +10 Triệu Xu, -10 Triệu Xu hoặc tùy chỉnh số dư bất kỳ.

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG

### Backend
* **Runtime:** [Node.js](https://nodejs.org/) (JavaScript ES6+)
* **Framework:** [Express.js](https://expressjs.com/) (RESTful APIs)
* **Realtime Engine:** [Socket.IO](https://socket.io/) (WebSockets hai chiều tốc độ cao)
* **Bảo Mật:** [JSON Web Token (JWT)](https://jwt.io/) & [bcryptjs](https://www.npmjs.com/package/bcryptjs) mã hóa mật khẩu
* **Cơ Sở Dữ Liệu:** JSON File-based DB (`data/db.json`) tự động đồng bộ hóa và lưu trữ bền vững

### Frontend
* **HTML5 Semantic:** Cấu trúc chuẩn SEO, trực quan, thân thiện
* **CSS3 Vanilla:** Hệ thống Design System màu sắc HSL sang trọng, glassmorphism, keyframes animation
* **JavaScript ES6+:** Module hóa controller, xử lý âm thanh Web Audio API, Canvas 2D đồ họa soi cầu

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### 1. Yêu cầu môi trường
* Đã cài đặt [Node.js](https://nodejs.org/) (phiên bản 16.x hoặc 18.x trở lên)
* Git

### 2. Tải mã nguồn về máy
```bash
git clone https://github.com/ThanhDZsudo/T-i-hay-T-y.git
cd T-i-hay-T-y
```

### 3. Cài đặt các gói phụ thuộc (Dependencies)
```bash
npm install
```

### 4. Khởi chạy Server
```bash
npm start
# hoặc
npm run dev
```

Server sẽ khởi động tại: **`http://localhost:3000`**

---

## 🔑 TÀI KHOẢN MẶC ĐỊNH

Hệ thống đã chuẩn bị sẵn các tài khoản demo để trải nghiệm ngay:

| Loại Tài Khoản | Tên Đăng Nhập | Mật Khẩu | Số Dư Ban Đầu | Quyền Hạn |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Quản Trị Viên (Admin)** | `admin` | `admin888` | 999,999,999 Xu | Toàn quyền kiểm soát, can thiệp tỉ lệ, ép kết quả, quản lý bot |
| **🎮 Người Chơi VIP 1** | `player1` | `123456` | 50,000,000 Xu | Đặt cược, nặn bát, soi cầu, chat |
| **🎮 Người Chơi VIP 2** | `player2` | `123456` | 20,000,000 Xu | Đặt cược, nặn bát, soi cầu, chat |
| **✨ Đăng Ký Mới** | *(Tùy chọn)* | *(Tùy chọn)* | **+10,000,000 Xu** | Nhận vốn khởi nghiệp miễn phí ngay sau khi tạo tài khoản |

> 💡 **Mẹo:** Bạn có thể mở một tab ẩn danh hoặc trình duyệt khác để đăng nhập tài khoản `admin` vào link `http://localhost:3000/admin.html` để điều phối trận đấu trong khi tab chính đóng vai trò người chơi tại `http://localhost:3000/game.html`.

---

## 📂 CẤU TRÚC DỰ ÁN

```text
TaiXiumini/
├── data/
│   └── db.json               # Cơ sở dữ liệu lưu trữ người dùng, lịch sử, cài đặt
├── public/
│   ├── css/
│   │   ├── style.css         # Phong cách trang Đăng nhập / Đăng ký
│   │   ├── game.css          # Phong cách bàn chơi Tài Xỉu, xúc xắc, nặn bát, chat
│   │   └── admin.css         # Phong cách bảng điều khiển Quản trị viên
│   ├── js/
│   │   ├── audio.js          # Bộ phát âm thanh Web Audio API chân thực
│   │   ├── dice.js           # Bộ điều khiển xúc xắc & kéo nặn bát 360 độ
│   │   ├── game.js           # Logic bàn chơi, WebSocket, chat, soi cầu
│   │   └── admin.js          # Logic Bảng điều khiển Admin God Mode
│   ├── favicon.svg           # Icon xúc xắc mạ vàng
│   ├── index.html            # Cổng đăng nhập & đăng ký thành viên
│   ├── game.html             # Bàn chơi Tài Xỉu VIP
│   └── admin.html            # Bảng điều khiển Quản trị viên
├── server/
│   ├── app.js                # Express Server, WebSocket Socket.IO và REST API
│   ├── botEngine.js          # Thuật toán giả lập bot đặt cược tự động thông minh
│   ├── db.js                 # Lớp trừu tượng quản lý cơ sở dữ liệu JSON
│   └── gameEngine.js         # Động cơ vòng lặp ván chơi, tính điểm, trả thưởng, tỉ lệ
├── package.json              # Khai báo thư viện và script khởi chạy
└── README.md                 # Tài liệu giới thiệu sản phẩm & hướng dẫn
```

---

## 📜 LUẬT CHƠI & CÁCH TÍNH ĐIỂM

* **Tổng Điểm 3 Viên Xúc Xắc:** Từ 3 đến 18 điểm.
* **Cửa XỈU:** Tổng điểm từ **4 đến 10 điểm** (trừ trường hợp Bão 3 mặt giống nhau).
* **Cửa TÀI:** Tổng điểm từ **11 đến 17 điểm** (trừ trường hợp Bão 3 mặt giống nhau).
* **Trường Hợp BÃO (Bộ Ba Đồng Nhất):** Ba viên xúc xắc cùng một mặt (1-1-1, 2-2-2, 3-3-3, 4-4-4, 5-5-5, 6-6-6), nhà cái ăn cả hai cửa Tài và Xỉu.
* **Tỷ Lệ Thưởng:** 1 ăn 0.7 (cược 1,000,000 Xu thắng nhận về 1,700,000 Xu bao gồm 1,000,000 Xu gốc + 700,000 Xu tiền thưởng).

---

## 🛡️ BẢN QUYỀN & GIẤY PHÉP

Dự án được phát triển phục vụ mục đích học tập, nghiên cứu công nghệ WebSockets và phát triển ứng dụng web thời gian thực.
Phát hành theo giấy phép **MIT License**.
