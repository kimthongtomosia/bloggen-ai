# bloggen-ai

#CLI 

Công cụ CLI để quản lý hệ thống tự động tạo blog

Options:
bloggen -V, --version            output the version number
bloggen -h, --help               display help for command

Commands:
bloggen schedule [options]       Lên lịch crawl tự động từ file CSV
bloggen stop-schedule <csvPath>  Dừng lịch crawl cho file CSV đã lên lịch trước đó
bloggen init                     Khởi tạo cấu hình và kết nối database
bloggen crawl [options] <url>    Crawl và tạo bài viết từ một URL
bloggen batch <csvFile>          Xử lý hàng loạt URL từ file CSV
bloggen list [options]           Liệt kê các bài viết đã tạo
bloggen export [options]         Xuất bài viết ra file
bloggen help [command]           display help for command

bloggen crawl https://vnexpress.net --style="Hài hước" --category="Tin tức"