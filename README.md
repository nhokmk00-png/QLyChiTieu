# Quản lý chi tiêu cá nhân

Ứng dụng web mobile-first giúp ghi nhận chi tiêu hằng ngày, theo dõi ngân sách tháng, xem báo cáo theo danh mục và quản lý dữ liệu tạm bằng `localStorage`.

## Cấu trúc thư mục

- `app.py`: máy chủ Python nhỏ để chạy ứng dụng tĩnh.
- `public/index.html`: khung HTML chính.
- `public/css/styles.css`: giao diện responsive, hỗ trợ sáng/tối.
- `public/js/app.js`: logic ứng dụng theo hướng OOP, xử lý dữ liệu, form, báo cáo và localStorage.

## Màn hình chính

- Bắt đầu: tên ứng dụng, mô tả, email tùy chọn, vào demo nhanh.
- Trang chủ: tổng chi tháng, ngân sách còn lại, mục tiêu tiết kiệm, khoản chi gần đây, nút thêm nổi bật.
- Thêm khoản chi: nhập số tiền, danh mục, ngày, ghi chú, phương thức thanh toán, kiểm tra lỗi rõ ràng.
- Báo cáo: lọc hôm nay, tuần này, tháng này, tùy chọn; có biểu đồ tròn và biểu đồ cột.
- Danh sách khoản chi: tìm kiếm, lọc danh mục, lọc tháng, sửa và xóa có xác nhận.
- Hồ sơ: cập nhật tên, email, ngân sách tháng, mục tiêu tiết kiệm.
- Cài đặt: bật nhắc nhập chi tiêu, đổi sáng/tối, chọn ngôn ngữ, đăng xuất, xóa hoặc khôi phục dữ liệu mẫu.

## Chạy ứng dụng

```powershell
python app.py
```

Sau đó mở `http://127.0.0.1:8000`.
