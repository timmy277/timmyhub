---
name: docs-audit
description: Kiểm tra tính toàn vẹn của bộ docs/ TimmyHub — link chết, truy vết hai chiều FEAT/REQ/TASK, số liệu thống kê lệch giữa các file, front-matter thiếu, Mermaid lỗi. Dùng trước khi commit một loạt docs, trước mỗi mốc phát hành, hoặc khi được yêu cầu "kiểm tra docs", "rà soát tài liệu".
---

# Rà soát bộ docs

Chạy lần lượt, báo cáo theo bảng: hạng mục · số lỗi · danh sách cụ thể. **Không tự sửa** trước khi báo cáo, trừ khi
được yêu cầu rõ ràng.

## 1. Link chết

```bash
python - <<'EOF'
import os, re, io
pat = re.compile(r'\[[^\]]*\]\(([^)\s]+)\)')
for root, _, files in os.walk('docs'):
    for f in (x for x in files if x.endswith('.md')):
        src = os.path.join(root, f)
        for i, line in enumerate(io.open(src, encoding='utf-8'), 1):
            for m in pat.finditer(line):
                t = m.group(1).split('#')[0]
                if not t or t.startswith(('http', 'mailto:')):
                    continue
                if not os.path.exists(os.path.normpath(os.path.join(root, t))):
                    print(f'DEAD  {src}:{i} -> {t}')
EOF
```

Link trỏ tới file **chưa viết** trong kế hoạch thì báo riêng thành nhóm "tham chiếu trước", không xếp chung với link sai.


## 2. Truy vết hai chiều

Ba luật, mỗi luật liệt kê ID vi phạm:

1. Mọi `FEAT-*` trong `00-overview/feature-inventory.md` xuất hiện trong ít nhất một `03-specs/*/requirements.md`.
2. Mọi `REQ-*` định nghĩa trong `requirements.md` được tham chiếu trong `tasks.md` cùng domain.
3. Mọi `TASK-*` có dòng `Ref:` chứa ít nhất một `REQ-*` tồn tại thật.

```bash
grep -rhoE 'FEAT-[A-Z]+-[0-9]{3}' docs/00-overview/feature-inventory.md | sort -u > /tmp/feat.txt
grep -rhoE 'FEAT-[A-Z]+-[0-9]{3}' docs/03-specs | sort -u > /tmp/feat-used.txt
comm -23 /tmp/feat.txt /tmp/feat-used.txt    # feature chưa có requirement nào
```

## 3. Số liệu thống kê

Các con số này lặp ở nhiều file và **rất hay lệch** — đếm lại từ nguồn thay vì tin vào câu chữ:

| Con số | Nguồn sự thật | Nơi lặp lại phải khớp |
|---|---|---|
| Tổng số feature | đếm dòng `\| FEAT-` trong `feature-inventory.md` | `project-plan.md` §1, §5, Phụ lục A, `README.md` |
| P0/P1/P2 | đếm theo cột ưu tiên | `project-plan.md` §5 |
| Số domain event | đếm trong `event-catalog.md` | `project-plan.md` §1, §8, Phụ lục F |
| Số service | `service-catalog.md` | `project-plan.md`, `system-architecture.md` |
| Số ADR | đếm file trong `01-architecture/adr/` | `project-plan.md` §1, §17 |

```bash
grep -c '^| FEAT-' docs/00-overview/feature-inventory.md
```

## 4. Front-matter

Mọi file `.md` trong `docs/` (trừ `README.md`) phải có `title`, `status`, `owner`, `updated`, `related`.
`status` ∈ {`draft`, `review`, `approved`}. `updated` không được cũ hơn lần sửa nội dung gần nhất theo git.

## 5. Mermaid

Đếm số khối ```` ```mermaid ```` và kiểm sơ bộ: mỗi khối mở có khối đóng; `stateDiagram-v2`/`flowchart`/`sequenceDiagram`/
`erDiagram`/`gantt` là từ khoá đầu tiên; không có ký tự `|` chưa escape trong nhãn.

## 6. Quy ước viết

- Không có chuỗi tiếng Anh dài trong phần văn xuôi (identifier thì được).
- Thụt lề 4 space, kết dòng LF, không có khoảng trắng cuối dòng.
- Mỗi tài liệu quy tắc coding có ít nhất một cặp ❌ BAD / ✅ GOOD.
- Không có bí mật thật trong ví dụ: quét `gitleaks detect --no-git` trên `docs/`.

## Báo cáo

Kết thúc bằng bảng tóm tắt và, với mỗi lỗi, đề xuất sửa cụ thể (file + dòng). Nếu không có lỗi thì nói rõ đã kiểm
những gì và số lượng đối tượng đã đối chiếu — đừng chỉ nói "không có vấn đề".
