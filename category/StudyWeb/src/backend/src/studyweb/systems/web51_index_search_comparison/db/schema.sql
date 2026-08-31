drop table if exists products;
create table products (
  id serial primary key,
  name text not null,
  status text not null,
  created_at timestamp not null default now()
);
-- create index idx_products_name on products(name);
