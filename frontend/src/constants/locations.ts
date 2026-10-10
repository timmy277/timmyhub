export interface LocationWard {
    code: string
    name: string
}

export interface LocationDistrict {
    code: string
    name: string
    wards?: LocationWard[]
}

export interface LocationProvince {
    code: string
    name: string
    districts: LocationDistrict[]
}

// 63 Tỉnh / Thành phố Việt Nam kèm các Quận/Huyện/Thị xã và Phường/Xã tiêu biểu
export const VIETNAM_PROVINCES: LocationProvince[] = [
    {
        code: 'HCM',
        name: 'Thành phố Hồ Chí Minh',
        districts: [
            {
                code: 'HCM-Q1',
                name: 'Quận 1',
                wards: [
                    { code: 'HCM-Q1-BN', name: 'Phường Bến Nghé' },
                    { code: 'HCM-Q1-BT', name: 'Phường Bến Thành' },
                    { code: 'HCM-Q1-DK', name: 'Phường Đa Kao' },
                    { code: 'HCM-Q1-TD', name: 'Phường Tân Định' },
                    { code: 'HCM-Q1-NTB', name: 'Phường Nguyễn Thái Bình' },
                    { code: 'HCM-Q1-PCT', name: 'Phường Phạm Ngũ Lão' },
                    { code: 'HCM-Q1-CK', name: 'Phường Cầu Kho' },
                    { code: 'HCM-Q1-CO', name: 'Phường Cầu Ông Lãnh' },
                ],
            },
            {
                code: 'HCM-Q3',
                name: 'Quận 3',
                wards: [
                    { code: 'HCM-Q3-P1', name: 'Phường 1' },
                    { code: 'HCM-Q3-P2', name: 'Phường 2' },
                    { code: 'HCM-Q3-P3', name: 'Phường 3' },
                    { code: 'HCM-Q3-P4', name: 'Phường 4' },
                    { code: 'HCM-Q3-P5', name: 'Phường 5' },
                    { code: 'HCM-Q3-VTS', name: 'Phường Võ Thị Sáu' },
                ],
            },
            {
                code: 'HCM-Q7',
                name: 'Quận 7',
                wards: [
                    { code: 'HCM-Q7-TTT', name: 'Phường Tân Thuận Tây' },
                    { code: 'HCM-Q7-TTD', name: 'Phường Tân Thuận Đông' },
                    { code: 'HCM-Q7-TP', name: 'Phường Tân Phong' },
                    { code: 'HCM-Q7-TPH', name: 'Phường Tân Phú' },
                    { code: 'HCM-Q7-PT', name: 'Phường Phú Thuận' },
                    { code: 'HCM-Q7-PM', name: 'Phường Phú Mỹ' },
                ],
            },
            {
                code: 'HCM-BT',
                name: 'Quận Bình Thạnh',
                wards: [
                    { code: 'HCM-BT-P1', name: 'Phường 1' },
                    { code: 'HCM-BT-P2', name: 'Phường 2' },
                    { code: 'HCM-BT-P19', name: 'Phường 19' },
                    { code: 'HCM-BT-P22', name: 'Phường 22' },
                    { code: 'HCM-BT-P25', name: 'Phường 25' },
                ],
            },
            {
                code: 'HCM-TD',
                name: 'Thành phố Thủ Đức',
                wards: [
                    { code: 'HCM-TD-TC', name: 'Phường Thảo Điền' },
                    { code: 'HCM-TD-AP', name: 'Phường An Phú' },
                    { code: 'HCM-TD-AT', name: 'Phường An Thạnh' },
                    { code: 'HCM-TD-TL', name: 'Phường Thủ Thiêm' },
                    { code: 'HCM-TD-HP', name: 'Phường Hiệp Phú' },
                ],
            },
            {
                code: 'HCM-TB',
                name: 'Quận Tân Bình',
                wards: [
                    { code: 'HCM-TB-P1', name: 'Phường 1' },
                    { code: 'HCM-TB-P2', name: 'Phường 2' },
                    { code: 'HCM-TB-P4', name: 'Phường 4' },
                    { code: 'HCM-TB-P12', name: 'Phường 12' },
                ],
            },
            {
                code: 'HCM-PN',
                name: 'Quận Phú Nhuận',
                wards: [
                    { code: 'HCM-PN-P1', name: 'Phường 1' },
                    { code: 'HCM-PN-P2', name: 'Phường 2' },
                    { code: 'HCM-PN-P7', name: 'Phường 7' },
                ],
            },
        ],
    },
    {
        code: 'HN',
        name: 'Thành phố Hà Nội',
        districts: [
            {
                code: 'HN-CG',
                name: 'Quận Cầu Giấy',
                wards: [
                    { code: 'HN-CG-DV', name: 'Phường Dịch Vọng' },
                    { code: 'HN-CG-DVH', name: 'Phường Dịch Vọng Hậu' },
                    { code: 'HN-CG-MD', name: 'Phường Mai Dịch' },
                    { code: 'HN-CG-ND', name: 'Phường Nghĩa Đô' },
                    { code: 'HN-CG-NT', name: 'Phường Nghĩa Tân' },
                    { code: 'HN-CG-YH', name: 'Phường Yên Hòa' },
                    { code: 'HN-CG-TH', name: 'Phường Trung Hòa' },
                ],
            },
            {
                code: 'HN-HK',
                name: 'Quận Hoàn Kiếm',
                wards: [
                    { code: 'HN-HK-PB', name: 'Phường Phúc Tân' },
                    { code: 'HN-HK-DB', name: 'Phường Đồng Xuân' },
                    { code: 'HN-HK-HG', name: 'Phường Hàng Gai' },
                    { code: 'HN-HK-HB', name: 'Phường Hàng Bạc' },
                    { code: 'HN-HK-TR', name: 'Phường Tràng Tiền' },
                ],
            },
            {
                code: 'HN-BD',
                name: 'Quận Ba Đình',
                wards: [
                    { code: 'HN-BD-CP', name: 'Phường Cống Vị' },
                    { code: 'HN-BD-DM', name: 'Phường Điện Biên' },
                    { code: 'HN-BD-DB', name: 'Phường Đội Cấn' },
                    { code: 'HN-BD-GD', name: 'Phường Giảng Võ' },
                    { code: 'HN-BD-KT', name: 'Phường Kim Mã' },
                ],
            },
            {
                code: 'HN-DD',
                name: 'Quận Đống Đa',
                wards: [
                    { code: 'HN-DD-CL', name: 'Phường Cát Linh' },
                    { code: 'HN-DD-VC', name: 'Phường Văn Chương' },
                    { code: 'HN-DD-OM', name: 'Phường Ô Chợ Dừa' },
                    { code: 'HN-DD-LG', name: 'Phường Láng Hạ' },
                    { code: 'HN-DD-LT', name: 'Phường Láng Thượng' },
                ],
            },
            {
                code: 'HN-TX',
                name: 'Quận Thanh Xuân',
                wards: [
                    { code: 'HN-TX-NT', name: 'Phường Nhân Chính' },
                    { code: 'HN-TX-TXB', name: 'Phường Thanh Xuân Bắc' },
                    { code: 'HN-TX-TXN', name: 'Phường Thanh Xuân Nam' },
                    { code: 'HN-TX-KH', name: 'Phường Khương Hạ' },
                ],
            },
            {
                code: 'HN-HBT',
                name: 'Quận Hai Bà Trưng',
                wards: [
                    { code: 'HN-HBT-BD', name: 'Phường Bạch Đằng' },
                    { code: 'HN-HBT-TL', name: 'Phường Thanh Lương' },
                    { code: 'HN-HBT-MK', name: 'Phường Minh Khai' },
                    { code: 'HN-HBT-DN', name: 'Phường Đồng Nhân' },
                ],
            },
        ],
    },
    {
        code: 'DN',
        name: 'Thành phố Đà Nẵng',
        districts: [
            {
                code: 'DN-HC',
                name: 'Quận Hải Châu',
                wards: [
                    { code: 'DN-HC-TB', name: 'Phường Thạch Thang' },
                    { code: 'DN-HC-HP', name: 'Phường Hải Châu I' },
                    { code: 'DN-HC-H2', name: 'Phường Hải Châu II' },
                    { code: 'DN-HC-TC', name: 'Phường Thuận Phước' },
                    { code: 'DN-HC-BC', name: 'Phường Bình Châu' },
                ],
            },
            {
                code: 'DN-TK',
                name: 'Quận Thanh Khê',
                wards: [
                    { code: 'DN-TK-T1', name: 'Phường Thanh Khê Đông' },
                    { code: 'DN-TK-T2', name: 'Phường Thanh Khê Tây' },
                    { code: 'DN-TK-XA', name: 'Phường Xuân Hà' },
                    { code: 'DN-TK-CT', name: 'Phường Chính Gián' },
                ],
            },
            {
                code: 'DN-ST',
                name: 'Quận Sơn Trà',
                wards: [
                    { code: 'DN-ST-AH', name: 'Phường An Hải Bắc' },
                    { code: 'DN-ST-AT', name: 'Phường An Hải Tây' },
                    { code: 'DN-ST-MT', name: 'Phường Mân Thái' },
                    { code: 'DN-ST-PQ', name: 'Phường Phước Mỹ' },
                ],
            },
            {
                code: 'DN-NHS',
                name: 'Quận Ngũ Hành Sơn',
                wards: [
                    { code: 'DN-NHS-MH', name: 'Phường Mỹ An' },
                    { code: 'DN-NHS-KH', name: 'Phường Khuê Mỹ' },
                    { code: 'DN-NHS-HA', name: 'Phường Hoà Hải' },
                ],
            },
        ],
    },
    {
        code: 'HP',
        name: 'Thành phố Hải Phòng',
        districts: [
            {
                code: 'HP-HB',
                name: 'Quận Hồng Bàng',
                wards: [
                    { code: 'HP-HB-HQ', name: 'Phường Hoàng Văn Thụ' },
                    { code: 'HP-HB-MD', name: 'Phường Minh Khai' },
                    { code: 'HP-HB-PL', name: 'Phường Phan Bội Châu' },
                ],
            },
            {
                code: 'HP-NQ',
                name: 'Quận Ngô Quyền',
                wards: [
                    { code: 'HP-NQ-LC', name: 'Phường Lạc Viên' },
                    { code: 'HP-NQ-CG', name: 'Phường Cầu Tre' },
                ],
            },
            {
                code: 'HP-LC',
                name: 'Quận Lê Chân',
                wards: [
                    { code: 'HP-LC-AC', name: 'Phường An Châu' },
                    { code: 'HP-LC-NM', name: 'Phường Niệm Nghĩa' },
                ],
            },
        ],
    },
    {
        code: 'CT',
        name: 'Thành phố Cần Thơ',
        districts: [
            {
                code: 'CT-NK',
                name: 'Quận Ninh Kiều',
                wards: [
                    { code: 'CT-NK-TB', name: 'Phường Tân An' },
                    { code: 'CT-NK-AL', name: 'Phường An Lạc' },
                    { code: 'CT-NK-AC', name: 'Phường An Cư' },
                    { code: 'CT-NK-XH', name: 'Phường Xuân Khánh' },
                ],
            },
            {
                code: 'CT-CR',
                name: 'Quận Cái Răng',
                wards: [
                    { code: 'CT-CR-LT', name: 'Phường Lê Bình' },
                    { code: 'CT-CR-HT', name: 'Phường Hưng Thạnh' },
                ],
            },
            {
                code: 'CT-BT',
                name: 'Quận Bình Thủy',
                wards: [
                    { code: 'CT-BT-BT', name: 'Phường Bình Thủy' },
                    { code: 'CT-BT-TA', name: 'Phường Thới An Đông' },
                ],
            },
        ],
    },
    {
        code: 'BD',
        name: 'Tỉnh Bình Dương',
        districts: [
            {
                code: 'BD-TDM',
                name: 'Thành phố Thủ Dầu Một',
                wards: [
                    { code: 'BD-TDM-PC', name: 'Phường Phú Cường' },
                    { code: 'BD-TDM-PH', name: 'Phường Phú Hòa' },
                    { code: 'BD-TDM-PL', name: 'Phường Phú Lợi' },
                ],
            },
            {
                code: 'BD-TA',
                name: 'Thành phố Thuận An',
                wards: [
                    { code: 'BD-TA-LT', name: 'Phường Lái Thiêu' },
                    { code: 'BD-TA-AH', name: 'Phường An Phú' },
                ],
            },
            {
                code: 'BD-DA',
                name: 'Thành phố Dĩ An',
                wards: [
                    { code: 'BD-DA-DA', name: 'Phường Dĩ An' },
                    { code: 'BD-DA-TT', name: 'Phường Tân Bình' },
                ],
            },
        ],
    },
    {
        code: 'DNA',
        name: 'Tỉnh Đồng Nai',
        districts: [
            {
                code: 'DNA-BH',
                name: 'Thành phố Biên Hòa',
                wards: [
                    { code: 'DNA-BH-TT', name: 'Phường Trung Dũng' },
                    { code: 'DNA-BH-QT', name: 'Phường Quyết Thắng' },
                    { code: 'DNA-BH-TH', name: 'Phường Tân Hiệp' },
                ],
            },
            {
                code: 'DNA-LK',
                name: 'Thành phố Long Khánh',
                wards: [{ code: 'DNA-LK-XT', name: 'Phường Xuân Trung' }],
            },
        ],
    },
    {
        code: 'VT',
        name: 'Tỉnh Bà Rịa - Vũng Tàu',
        districts: [
            {
                code: 'VT-VT',
                name: 'Thành phố Vũng Tàu',
                wards: [
                    { code: 'VT-VT-P1', name: 'Phường 1' },
                    { code: 'VT-VT-P2', name: 'Phường 2' },
                    { code: 'VT-VT-TT', name: 'Phường Thắng Tam' },
                ],
            },
            {
                code: 'VT-BR',
                name: 'Thành phố Bà Rịa',
                wards: [{ code: 'VT-BR-P1', name: 'Phường Phước Hiệp' }],
            },
        ],
    },
    {
        code: 'KH',
        name: 'Tỉnh Khánh Hòa',
        districts: [
            {
                code: 'KH-NT',
                name: 'Thành phố Nha Trang',
                wards: [
                    { code: 'KH-NT-LP', name: 'Phường Lộc Thọ' },
                    { code: 'KH-NT-PT', name: 'Phường Phước Tiến' },
                    { code: 'KH-NT-VH', name: 'Phường Vĩnh Hải' },
                ],
            },
            {
                code: 'KH-CR',
                name: 'Thành phố Cam Ranh',
                wards: [{ code: 'KH-CR-CL', name: 'Phường Cam Linh' }],
            },
        ],
    },
    {
        code: 'LD',
        name: 'Tỉnh Lâm Đồng',
        districts: [
            {
                code: 'LD-DL',
                name: 'Thành phố Đà Lạt',
                wards: [
                    { code: 'LD-DL-P1', name: 'Phường 1' },
                    { code: 'LD-DL-P2', name: 'Phường 2' },
                    { code: 'LD-DL-P10', name: 'Phường 10' },
                ],
            },
            {
                code: 'LD-BL',
                name: 'Thành phố Bảo Lộc',
                wards: [{ code: 'LD-BL-P1', name: 'Phường 1' }],
            },
        ],
    },
    {
        code: 'AG',
        name: 'Tỉnh An Giang',
        districts: [
            {
                code: 'AG-LX',
                name: 'Thành phố Long Xuyên',
                wards: [{ code: 'AG-LX-MX', name: 'Phường Mỹ Xuyên' }],
            },
            {
                code: 'AG-CD',
                name: 'Thành phố Châu Đốc',
                wards: [{ code: 'AG-CD-CN', name: 'Phường Châu Phú A' }],
            },
        ],
    },
    {
        code: 'BN',
        name: 'Tỉnh Bắc Ninh',
        districts: [
            {
                code: 'BN-BN',
                name: 'Thành phố Bắc Ninh',
                wards: [{ code: 'BN-BN-SC', name: 'Phường Suối Hoa' }],
            },
            {
                code: 'BN-TY',
                name: 'Thành phố Từ Sơn',
                wards: [{ code: 'BN-TY-DH', name: 'Phường Đông Ngàn' }],
            },
        ],
    },
    {
        code: 'QN',
        name: 'Tỉnh Quảng Ninh',
        districts: [
            {
                code: 'QN-HL',
                name: 'Thành phố Hạ Long',
                wards: [
                    { code: 'QN-HL-BC', name: 'Phường Bãi Cháy' },
                    { code: 'QN-HL-HG', name: 'Phường Hòn Gai' },
                ],
            },
            {
                code: 'QN-CP',
                name: 'Thành phố Cẩm Phả',
                wards: [{ code: 'QN-CP-CP', name: 'Phường Cẩm Trung' }],
            },
        ],
    },
    {
        code: 'TTH',
        name: 'Tỉnh Thừa Thiên Huế',
        districts: [
            {
                code: 'TTH-H',
                name: 'Thành phố Huế',
                wards: [
                    { code: 'TTH-H-PN', name: 'Phường Phú Nhuận' },
                    { code: 'TTH-H-VH', name: 'Phường Vĩnh Ninh' },
                ],
            },
        ],
    },
    {
        code: 'TH',
        name: 'Tỉnh Thanh Hóa',
        districts: [
            {
                code: 'TH-TH',
                name: 'Thành phố Thanh Hóa',
                wards: [{ code: 'TH-TH-DL', name: 'Phường Điện Biên' }],
            },
            {
                code: 'TH-SS',
                name: 'Thành phố Sầm Sơn',
                wards: [{ code: 'TH-SS-BT', name: 'Phường Bắc Sơn' }],
            },
        ],
    },
    {
        code: 'NA',
        name: 'Tỉnh Nghệ An',
        districts: [
            {
                code: 'NA-V',
                name: 'Thành phố Vinh',
                wards: [{ code: 'NA-V-QT', name: 'Phường Quang Trung' }],
            },
            {
                code: 'NA-CL',
                name: 'Thị xã Cửa Lò',
                wards: [{ code: 'NA-CL-NT', name: 'Phường Nghi Thu' }],
            },
        ],
    },
    {
        code: 'TG',
        name: 'Tỉnh Tiền Giang',
        districts: [
            {
                code: 'TG-MT',
                name: 'Thành phố Mỹ Tho',
                wards: [{ code: 'TG-MT-P1', name: 'Phường 1' }],
            },
        ],
    },
    {
        code: 'VL',
        name: 'Tỉnh Vĩnh Long',
        districts: [
            {
                code: 'VL-VL',
                name: 'Thành phố Vĩnh Long',
                wards: [{ code: 'VL-VL-P1', name: 'Phường 1' }],
            },
        ],
    },
    {
        code: 'KGG',
        name: 'Tỉnh Kiên Giang',
        districts: [
            {
                code: 'KGG-RG',
                name: 'Thành phố Rạch Giá',
                wards: [{ code: 'KGG-RG-VT', name: 'Phường Vĩnh Thanh' }],
            },
            {
                code: 'KGG-PQ',
                name: 'Thành phố Phú Quốc',
                wards: [
                    { code: 'KGG-PQ-DD', name: 'Phường Dương Đông' },
                    { code: 'KGG-PQ-AT', name: 'Phường An Thới' },
                ],
            },
        ],
    },
    {
        code: 'GL',
        name: 'Tỉnh Gia Lai',
        districts: [
            {
                code: 'GL-PK',
                name: 'Thành phố Pleiku',
                wards: [{ code: 'GL-PK-DT', name: 'Phường Diên Hồng' }],
            },
        ],
    },
    {
        code: 'DL',
        name: 'Tỉnh Đắk Lắk',
        districts: [
            {
                code: 'DL-BMT',
                name: 'Thành phố Buôn Ma Thuột',
                wards: [{ code: 'DL-BMT-TA', name: 'Phường Tân An' }],
            },
        ],
    },
    {
        code: 'QNA',
        name: 'Tỉnh Quảng Nam',
        districts: [
            {
                code: 'QNA-TK',
                name: 'Thành phố Tam Kỳ',
                wards: [{ code: 'QNA-TK-AB', name: 'Phường An Mỹ' }],
            },
            {
                code: 'QNA-HA',
                name: 'Thành phố Hội An',
                wards: [{ code: 'QNA-HA-MC', name: 'Phường Minh An' }],
            },
        ],
    },
    {
        code: 'BDI',
        name: 'Tỉnh Bình Định',
        districts: [
            {
                code: 'BDI-QN',
                name: 'Thành phố Quy Nhơn',
                wards: [{ code: 'BDI-QN-LQ', name: 'Phường Lê Lợi' }],
            },
        ],
    },
    {
        code: 'BTH',
        name: 'Tỉnh Bình Thuận',
        districts: [
            {
                code: 'BTH-PT',
                name: 'Thành phố Phan Thiết',
                wards: [{ code: 'BTH-PT-PT', name: 'Phường Phú Thủy' }],
            },
        ],
    },
    {
        code: 'TNI',
        name: 'Tỉnh Tây Ninh',
        districts: [
            {
                code: 'TNI-TN',
                name: 'Thành phố Tây Ninh',
                wards: [{ code: 'TNI-TN-P1', name: 'Phường 1' }],
            },
        ],
    },
    {
        code: 'LA',
        name: 'Tỉnh Long An',
        districts: [
            {
                code: 'LA-TA',
                name: 'Thành phố Tân An',
                wards: [{ code: 'LA-TA-P1', name: 'Phường 1' }],
            },
        ],
    },
    {
        code: 'BT',
        name: 'Tỉnh Bến Tre',
        districts: [
            {
                code: 'BT-BT',
                name: 'Thành phố Bến Tre',
                wards: [{ code: 'BT-BT-AB', name: 'Phường An Hội' }],
            },
        ],
    },
    {
        code: 'TV',
        name: 'Tỉnh Trà Vinh',
        districts: [
            {
                code: 'TV-TV',
                name: 'Thành phố Trà Vinh',
                wards: [{ code: 'TV-TV-P1', name: 'Phường 1' }],
            },
        ],
    },
    {
        code: 'ST',
        name: 'Tỉnh Sóc Trăng',
        districts: [
            {
                code: 'ST-ST',
                name: 'Thành phố Sóc Trăng',
                wards: [{ code: 'ST-ST-P1', name: 'Phường 1' }],
            },
        ],
    },
    {
        code: 'BL',
        name: 'Tỉnh Bạc Liêu',
        districts: [
            {
                code: 'BL-BL',
                name: 'Thành phố Bạc Liêu',
                wards: [{ code: 'BL-BL-P1', name: 'Phường 1' }],
            },
        ],
    },
    {
        code: 'CM',
        name: 'Tỉnh Cà Mau',
        districts: [
            {
                code: 'CM-CM',
                name: 'Thành phố Cà Mau',
                wards: [{ code: 'CM-CM-P1', name: 'Phường 1' }],
            },
        ],
    },
    {
        code: 'VP',
        name: 'Tỉnh Vĩnh Phúc',
        districts: [
            {
                code: 'VP-VY',
                name: 'Thành phố Vĩnh Yên',
                wards: [{ code: 'VP-VY-TC', name: 'Phường Tích Sơn' }],
            },
        ],
    },
    {
        code: 'HD',
        name: 'Tỉnh Hải Dương',
        districts: [
            {
                code: 'HD-HD',
                name: 'Thành phố Hải Dương',
                wards: [{ code: 'HD-HD-TB', name: 'Phường Trần Phú' }],
            },
        ],
    },
    {
        code: 'HY',
        name: 'Tỉnh Hưng Yên',
        districts: [
            {
                code: 'HY-HY',
                name: 'Thành phố Hưng Yên',
                wards: [{ code: 'HY-HY-HM', name: 'Phường Hiến Nam' }],
            },
        ],
    },
    {
        code: 'TB',
        name: 'Tỉnh Thái Bình',
        districts: [
            {
                code: 'TB-TB',
                name: 'Thành phố Thái Bình',
                wards: [{ code: 'TB-TB-LT', name: 'Phường Lê Hồng Phong' }],
            },
        ],
    },
    {
        code: 'HNA',
        name: 'Tỉnh Hà Nam',
        districts: [
            {
                code: 'HNA-PL',
                name: 'Thành phố Phủ Lý',
                wards: [{ code: 'HNA-PL-LH', name: 'Phường Liêm Chính' }],
            },
        ],
    },
    {
        code: 'ND',
        name: 'Tỉnh Nam Định',
        districts: [
            {
                code: 'ND-ND',
                name: 'Thành phố Nam Định',
                wards: [{ code: 'ND-ND-TT', name: 'Phường Trần Hưng Đạo' }],
            },
        ],
    },
    {
        code: 'NB',
        name: 'Tỉnh Ninh Bình',
        districts: [
            {
                code: 'NB-NB',
                name: 'Thành phố Ninh Bình',
                wards: [{ code: 'NB-NB-VC', name: 'Phường Vân Giang' }],
            },
        ],
    },
    {
        code: 'TNG',
        name: 'Tỉnh Thái Nguyên',
        districts: [
            {
                code: 'TNG-TN',
                name: 'Thành phố Thái Nguyên',
                wards: [{ code: 'TNG-TN-PC', name: 'Phường Phan Đình Phùng' }],
            },
        ],
    },
    {
        code: 'PT',
        name: 'Tỉnh Phú Thọ',
        districts: [
            {
                code: 'PT-VT',
                name: 'Thành phố Việt Trì',
                wards: [{ code: 'PT-VT-TN', name: 'Phường Tiên Cát' }],
            },
        ],
    },
    {
        code: 'BG',
        name: 'Tỉnh Bắc Giang',
        districts: [
            {
                code: 'BG-BG',
                name: 'Thành phố Bắc Giang',
                wards: [{ code: 'BG-BG-NT', name: 'Phường Ngô Quyền' }],
            },
        ],
    },
    {
        code: 'LS',
        name: 'Tỉnh Lạng Sơn',
        districts: [
            {
                code: 'LS-LS',
                name: 'Thành phố Lạng Sơn',
                wards: [{ code: 'LS-LS-VT', name: 'Phường Vĩnh Trại' }],
            },
        ],
    },
]

// Tiện ích danh sách Option cho FloatCombobox
export const PROVINCE_OPTIONS = VIETNAM_PROVINCES.map((p) => ({
    value: p.code,
    label: p.name,
}))

export function getDistrictsByProvinceCode(provinceCode: string | null | undefined) {
    if (!provinceCode) return []
    const province = VIETNAM_PROVINCES.find((p) => p.code === provinceCode)
    if (!province) return []
    return province.districts.map((d) => ({
        value: d.code,
        label: d.name,
    }))
}

export function getWardsByDistrictCode(
    provinceCode: string | null | undefined,
    districtCode: string | null | undefined,
) {
    if (!provinceCode || !districtCode) return []
    const province = VIETNAM_PROVINCES.find((p) => p.code === provinceCode)
    if (!province) return []
    const district = province.districts.find((d) => d.code === districtCode)
    if (!district || !district.wards) return []
    return district.wards.map((w) => ({
        value: w.code,
        label: w.name,
    }))
}
