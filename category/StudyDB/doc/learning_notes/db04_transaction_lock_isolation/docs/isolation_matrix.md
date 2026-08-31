# isolation matrix

| isolation level | dirty read | non-repeatable read | phantom read | note |
|---|---|---|---|---|
| READ COMMITTED | prevented | possible | possible | default in PostgreSQL |
| REPEATABLE READ | prevented | prevented | prevented in PostgreSQL behavior | reads are stable in transaction |
| SERIALIZABLE | prevented | prevented | prevented | may require retry |

