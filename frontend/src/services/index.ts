// Barrel export cho service gọi API/BE dùng chung xuyên nhiều feature. Thêm service mới vào thư mục
// này thì phải export lại ở đây — nơi khác trong repo chỉ import qua `@/services`, không import thẳng
// file con. Service gắn chặt với một domain cụ thể thì đặt trong `features/<domain>/`, không đưa vào đây.
export {}
