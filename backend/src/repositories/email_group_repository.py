from config.database import get_pool
from models.email_group import EmailGroup, EmailGroupMember
from typing import List, Optional

class EmailGroupRepository:
    @staticmethod
    async def create_group(user_id: int, group_name: str) -> EmailGroup:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO EmailGroups (user_id, group_name)
                    VALUES (%s, %s)
                    """,
                    (user_id, group_name)
                )
                group_id = cur.lastrowid
                await conn.commit()

                await cur.execute(
                    """
                    SELECT group_id, user_id, group_name, created_at, updated_at
                    FROM EmailGroups
                    WHERE group_id = %s
                    """,
                    (group_id,)
                )
                result = await cur.fetchone()
                return EmailGroup.from_db(result)

    @staticmethod
    async def add_member(group_id: int, email: str) -> EmailGroupMember:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO EmailGroupMembers (group_id, email)
                    VALUES (%s, %s)
                    """,
                    (group_id, email)
                )
                member_id = cur.lastrowid
                await conn.commit()

                await cur.execute(
                    """
                    SELECT member_id, group_id, email, created_at
                    FROM EmailGroupMembers
                    WHERE member_id = %s
                    """,
                    (member_id,)
                )
                result = await cur.fetchone()
                return EmailGroupMember.from_db(result)

    @staticmethod
    async def get_user_groups(user_id: int) -> List[EmailGroup]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT g.group_id, g.user_id, g.group_name, g.created_at, g.updated_at,
                           m.member_id, m.email as member_email, m.created_at as member_created_at
                    FROM EmailGroups g
                    LEFT JOIN EmailGroupMembers m ON g.group_id = m.group_id
                    WHERE g.user_id = %s
                    ORDER BY g.created_at DESC
                    """,
                    (user_id,)
                )
                results = await cur.fetchall()

                groups = {}
                for row in results:
                    group_id = row['group_id']
                    if group_id not in groups:
                        groups[group_id] = EmailGroup.from_db(row, [])

                    if row['member_id']:
                        member = EmailGroupMember(
                            member_id=row['member_id'],
                            group_id=group_id,
                            email=row['member_email'],
                            created_at=row['member_created_at']
                        )
                        groups[group_id].members.append(member)

                return list(groups.values())

    @staticmethod
    async def get_group(group_id: int) -> Optional[EmailGroup]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT g.group_id, g.user_id, g.group_name, g.created_at, g.updated_at,
                           m.member_id, m.email as member_email, m.created_at as member_created_at
                    FROM EmailGroups g
                    LEFT JOIN EmailGroupMembers m ON g.group_id = m.group_id
                    WHERE g.group_id = %s
                    """,
                    (group_id,)
                )
                results = await cur.fetchall()
                
                if not results:
                    return None

                members = []
                for row in results:
                    if row['member_id']:
                        member = EmailGroupMember(
                            member_id=row['member_id'],
                            group_id=group_id,
                            email=row['member_email'],
                            created_at=row['member_created_at']
                        )
                        members.append(member)

                return EmailGroup.from_db(results[0], members)

    @staticmethod
    async def delete_group(group_id: int) -> bool:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "DELETE FROM EmailGroups WHERE group_id = %s",
                    (group_id,)
                )
                await conn.commit()
                return cur.rowcount > 0

    @staticmethod
    async def delete_member(member_id: int) -> bool:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "DELETE FROM EmailGroupMembers WHERE member_id = %s",
                    (member_id,)
                )
                await conn.commit()
                return cur.rowcount > 0 