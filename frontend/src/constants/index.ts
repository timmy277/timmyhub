// Barrel export cho hằng số dùng chung xuyên nhiều feature (route path, giới hạn, key cookie/
// localStorage…). Thêm hằng số mới vào thư mục này thì phải export lại ở đây — nơi khác trong repo chỉ
// import qua `@/constants`, không import thẳng file con. Hằng số gắn chặt với một domain cụ thể thì
// đặt trong `features/<domain>/`, không đưa vào đây.
export {}
