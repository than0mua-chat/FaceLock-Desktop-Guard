# HƯỚNG DẪN KHỞI CHẠY BẢN DESKTOP WINDOWS (HOÀN TOÀN ĐỘC LẬP)

Ứng dụng **FaceLock Desktop Guard** hiện đã được cấu hình thành một phần mềm Desktop Native hoàn chỉnh chạy trên hệ điều hành **Windows 10 / Windows 11**, hoàn toàn không phụ thuộc vào trình duyệt Web và hoạt động **100% Offline**.

---

## 🚀 Cách 1: Khởi chạy nhanh 1-Click (Khuyên dùng)

1. Mở thư mục dự án trên máy tính Windows của bạn.
2. Click đúp chuột vào file:
   👉 **`start-desktop.bat`**
3. Kịch bản sẽ tự động:
   - Kiểm tra thư viện phần mềm.
   - Biên dịch ứng dụng Desktop offline (`npm run build`).
   - Khởi chạy cửa sổ ứng dụng Windows Native (`Electron`) trực tiếp trên màn hình của bạn.

---

## 🛠️ Cách 2: Khởi chạy bằng dòng lệnh (CMD / PowerShell / Terminal)

Nếu bạn muốn chạy bằng terminal:

```bash
# 1. Biên dịch mã nguồn ứng dụng
npm run build

# 2. Khởi chạy ứng dụng Desktop
npm run electron:start
```

---

## 📦 Cách 3: Đóng gói thành file cài đặt `.exe` độc lập

Nếu bạn muốn tạo file cài đặt Windows Installer (`.exe`) để cài lên bất kỳ máy nào:

1. Click đúp vào file:
   👉 **`build-installer.bat`**
   *(Hoặc chạy lệnh: `npm run build:exe`)*
2. Sau khi hoàn tất, file cài đặt Windows sẽ nằm trong thư mục:
   📁 **`release/FaceLock Desktop Guard Setup 1.0.0.exe`**

---

## 🌟 Các tính năng Desktop tích hợp sẵn:

1. **Khóa máy tính Windows thật (`LockWorkStation`)**:
   - Khi bạn rời khỏi webcam hoặc quay mặt đi, ứng dụng sẽ gọi lệnh hệ thống Windows:
     `rundll32.exe user32.dll,LockWorkStation` để khóa máy trạm thật sự.
2. **Khay hệ thống Windows (System Tray)**:
   - Khi bạn bấm nút thu nhỏ hoặc đóng `[X]`, ứng dụng sẽ thu về khay hệ thống cạnh đồng hồ Windows (góc dưới cùng bên phải), tiếp tục chạy ngầm bảo vệ máy tính của bạn mỗi 500ms mà không làm phiền bạn làm việc.
3. **Bóng tròn nổi nhanh (Floating Quick-Access Bubble)**:
   - Một widget nhỏ gọn nổi trên màn hình cho phép bạn kéo thả, bật/tắt bảo vệ hoặc tạm dừng (Snooze 15m/30m/1h) khi cần uống nước hoặc hội thoại.
4. **Nhận diện khuôn mặt 100% Offline**:
   - Sử dụng bộ cảm biến quang phổ và nhân trắc học khuôn mặt chạy trực tiếp trên CPU/GPU máy tính của bạn, không gửi bất kỳ hình ảnh nào ra internet.
