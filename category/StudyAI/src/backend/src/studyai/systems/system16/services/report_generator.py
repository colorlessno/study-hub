from __future__ import annotations


class ReportGenerator:
    def generate_report(self, requirement: dict, candidate_profile: dict, scoring_result: dict) -> dict:
        technical_detail = scoring_result["details"]["technical"]
        process_detail = scoring_result["details"]["process"]
        role_detail = scoring_result["details"]["role"]
        domain_detail = scoring_result["details"]["domain"]

        strengths = []
        if technical_detail["matched_required"]:
            strengths.append(f"必須技術に一致: {', '.join(technical_detail['matched_required'])}")
        if process_detail["matched"]:
            strengths.append(f"工程経験に一致: {', '.join(process_detail['matched'])}")
        if role_detail["matched"]:
            strengths.append(f"役割経験に一致: {', '.join(role_detail['matched'])}")

        concerns = []
        if technical_detail["missing_required"]:
            concerns.append(f"不足している必須技術: {', '.join(technical_detail['missing_required'])}")
        if domain_detail["missing"]:
            concerns.append(f"不足している業務知識: {', '.join(domain_detail['missing'])}")
        if candidate_profile.get("review_reasons"):
            concerns.append("入力解析の確認が必要")

        check_points = []
        if requirement.get("period"):
            check_points.append(f"要求経験年数 {requirement['period']} を満たすか追加確認する")
        if candidate_profile.get("review_required"):
            check_points.append("スキルシート解析結果を人手で確認する")
        if scoring_result["score_breakdown"]["technical_skills"] < 60:
            check_points.append("必須技術の具体的な担当範囲を面談で確認する")
        if not check_points:
            check_points.append("担当フェーズと役割の実績を面談で確認する")

        reasons = strengths[:1] if strengths else ["要求条件に対して部分的一致がある"]
        return {
            "match_reasons": " / ".join(reasons),
            "strengths": strengths or ["明確な一致ポイントは限定的"],
            "concerns": concerns or ["大きな懸念は検出されていない"],
            "check_points": check_points,
            "overall_comment": (
                f"総合スコアは {scoring_result['score']} 点で、判定レベルは {scoring_result['level']}。"
                " 必須技術、工程、役割の一致度を中心に評価した。"
            ),
        }
