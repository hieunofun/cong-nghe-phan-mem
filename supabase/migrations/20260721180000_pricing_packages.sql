-- JOBLINK - cap nhat bang gia va quota Kho CV cho goi Basic

UPDATE packages
SET can_search_cv = TRUE,
    max_cv_views = 10,
    description = '10 tin/tháng, 2 tin VIP và 10 lượt xem CV ứng viên.'
WHERE code = 'basic';
