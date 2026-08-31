insert into products(name, status)
select 'product-' || g, case when g % 2 = 0 then 'active' else 'archived' end
from generate_series(1, 10000) as g;
